# =============================================================================
# MedDroid v10 — STYLE-ONLY QLoRA fine-tune of MedGemma 4B on Kaggle
# =============================================================================
# Goal: fix ONLY MedGemma's language + tone/format gaps (multilingual, depth,
# structure, instruction-following, consistent safety framing) WITHOUT touching
# its facts. The dataset has NO dose numbers, so there is nothing factual to
# corrupt (the v3/v6 failure mode). Gentle recipe: small adapter, very low LR.
#
# HOW TO RUN: Kaggle notebook, GPU T4 x2 + Internet ON, HF_TOKEN secret ticked.
# Paste the two run cells your session was given, then Save & Run All (Commit).
# =============================================================================

# ---- 0. install ----
import os, subprocess, sys
def sh(c): print("$", c); subprocess.run(c, shell=True, check=True)
sh("pip install -q -U unsloth 'datasets>=2.19' trl peft accelerate bitsandbytes")

# ---- 1. Hugging Face auth (MedGemma is a gated Google model) ----
from huggingface_hub import login
try:
    from kaggle_secrets import UserSecretsClient
    HF_TOKEN = UserSecretsClient().get_secret("HF_TOKEN")
except Exception:
    HF_TOKEN = os.environ.get("HF_TOKEN", "")
if HF_TOKEN:
    login(HF_TOKEN)
else:
    print("!! No HF_TOKEN found — add it in Add-ons > Secrets, or MedGemma won't download.")

# ---- 2. load MedGemma 4B in 4-bit with Unsloth ----
from unsloth import FastModel
MAX_SEQ = 2048
model, tokenizer = FastModel.from_pretrained(
    model_name="google/medgemma-4b-it",
    max_seq_length=MAX_SEQ,
    load_in_4bit=True,
    full_finetuning=False,
)

# Small LoRA on the language layers only; vision tower frozen. Smaller rank than
# v3/v6 (r=8) = a lighter touch = less weight drift = less risk to facts.
model = FastModel.get_peft_model(
    model,
    r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    bias="none",
    finetune_vision_layers=False,
    finetune_language_layers=True,
    finetune_attention_modules=True,
    finetune_mlp_modules=True,
    random_state=42,
)

# ---- 3. build the STYLE-ONLY dataset ----
sh("curl -L -o build_dataset_v10.py https://raw.githubusercontent.com/sanjaydoc/medicalandroid/main/finetune/build_dataset_v10.py")
sh("curl -L -o lang_tone_seeds.jsonl https://raw.githubusercontent.com/sanjaydoc/medicalandroid/main/finetune/lang_tone_seeds.jsonl")
sh(f"{sys.executable} build_dataset_v10.py")

from datasets import load_dataset
raw = load_dataset("json", data_files={"train": "train.jsonl", "val": "val.jsonl"})

def to_text(ex):
    return {"text": tokenizer.apply_chat_template(ex["messages"], tokenize=False, add_generation_prompt=False)}

train_ds = raw["train"].map(to_text, remove_columns=raw["train"].column_names)
print("train examples:", len(train_ds))
print("---- sample ----\n", train_ds[0]["text"][:800])

# ---- 4. train (very gentle) ----
from trl import SFTTrainer, SFTConfig
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=train_ds,
    args=SFTConfig(
        dataset_text_field="text",
        max_seq_length=MAX_SEQ,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_ratio=0.1,
        num_train_epochs=3,
        learning_rate=2e-5,          # very low — a light style nudge only
        logging_steps=5,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="cosine",
        seed=42,
        output_dir="outputs",
        report_to="none",
    ),
)
trainer.train()

# ---- 5. save + export GGUF (+ vision projector) ----
model.save_pretrained("outputs/lora"); tokenizer.save_pretrained("outputs/lora")
print("saved LoRA adapter -> outputs/lora")
try:
    model.save_pretrained_gguf("outputs", tokenizer, quantization_method="q4_k_m")
    print("Exported GGUF.")
except Exception as e:
    print("GGUF export failed:", e)

# ---- 6. split the GGUF into ~500MB parts for reliable download ----
import glob as _glob, os as _os
_ggufs = sorted(set(_glob.glob("outputs*/**/*.gguf", recursive=True) + _glob.glob("outputs*/*.gguf")))
_q4 = [g for g in _ggufs if "q4" in g.lower()]
_target = _q4[0] if _q4 else (_ggufs[0] if _ggufs else None)
if _target:
    _d = _os.path.dirname(_target) or "."
    _b = _os.path.basename(_target)
    print("GGUF found:", _target)
    sh(f'cd "{_d}" && split -b 500M "{_b}" meddroid.part. && ls -la meddroid.part.* "{_b}"')
else:
    print("!! No GGUF found to split — check the export step above.")

print("""
DONE (v10 — style only). Next:
  - Save & Run All (Commit) so outputs persist; download from the version Output
    (or: kaggle kernels output meddroid97/<notebook> -p <dest>).
  - Assemble: Modelfile with TWO FROM lines (Q4_K_M gguf + F16-mmproj) for vision.
  - ollama create meddroid-v10 -f Modelfile
  - Benchmark: set MEDGEMMA_MODEL=meddroid-v10 and run benchmark_medical.py.
    WIN CRITERIA: Tamil answered IN TAMIL + better structure, AND dosing STILL
    correct (~4 g) + COPD still caught. If dosing drifts at all -> reject.
""")
