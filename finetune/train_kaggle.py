# =============================================================================
# MediMind — Step 2: QLoRA fine-tune MedGemma 4B on Kaggle (free 16 GB GPU)
# =============================================================================
# HOW TO RUN
#   1. kaggle.com -> Create -> New Notebook
#   2. Right panel: Accelerator = GPU T4 x2 (or P100) ; Internet = ON
#   3. Add-ons -> Secrets -> add HF_TOKEN = <your Hugging Face token>
#      (create one at huggingface.co/settings/tokens, and accept the MedGemma
#       licence at huggingface.co/google/medgemma-4b-it)
#   4. Paste this whole file into ONE cell and Run All.
#   5. When done, download outputs/medimind-medgemma.Q4_K_M.gguf from the
#      notebook's Output panel, then load it in Ollama (Modelfile below).
#
# NOTE: this fine-tunes the TEXT side (vision layers frozen). The exported GGUF
# is text-only; we recombine with MedGemma's vision projector later IF the text
# fine-tune proves worth shipping (measured with ../benchmark/benchmark_medical.py).
# Fine-tuning is iterative — if a cell errors, paste it back and we fix it.
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

# LoRA on the language layers only; keep the vision tower frozen.
model = FastModel.get_peft_model(
    model,
    r=16,
    lora_alpha=32,
    lora_dropout=0.0,
    bias="none",
    finetune_vision_layers=False,
    finetune_language_layers=True,
    finetune_attention_modules=True,
    finetune_mlp_modules=True,
    random_state=42,
)

# ---- 3. build the dataset (open data + your seed examples) ----
# Pull the Step-1 builder + seeds straight from the repo, then run it.
sh("curl -L -o build_dataset.py https://raw.githubusercontent.com/sanjaydoc/medicalandroid/main/finetune/build_dataset.py")
sh("curl -L -o seed_examples.jsonl https://raw.githubusercontent.com/sanjaydoc/medicalandroid/main/finetune/seed_examples.jsonl")
sh(f"{sys.executable} build_dataset.py")

from datasets import load_dataset
raw = load_dataset("json", data_files={"train": "train.jsonl", "val": "val.jsonl"})

def to_text(ex):
    # Render each {messages:[...]} into MedGemma's chat format as a single string.
    return {"text": tokenizer.apply_chat_template(ex["messages"], tokenize=False, add_generation_prompt=False)}

train_ds = raw["train"].map(to_text, remove_columns=raw["train"].column_names)
print("train examples:", len(train_ds))
print("---- sample ----\n", train_ds[0]["text"][:800])

# ---- 4. train ----
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
        warmup_steps=5,
        num_train_epochs=1,          # bump to 2-3 for a bigger run
        learning_rate=2e-4,
        logging_steps=10,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="linear",
        seed=42,
        output_dir="outputs",
        report_to="none",
    ),
)
trainer.train()

# ---- 5. save: LoRA adapter + merged + GGUF for Ollama ----
model.save_pretrained("outputs/lora"); tokenizer.save_pretrained("outputs/lora")
print("saved LoRA adapter -> outputs/lora")

# Merged 16-bit (for a GPU host later, keeps everything) + GGUF q4 (for Ollama, text).
try:
    model.save_pretrained_gguf("outputs", tokenizer, quantization_method="q4_k_m")
    # rename for clarity
    sh("ls -la outputs/*.gguf || true")
    print("Exported GGUF -> download it from the Output panel.")
except Exception as e:
    print("GGUF export failed (we can do it separately):", e)
    print("You still have the LoRA adapter in outputs/lora to work with.")

print("""
DONE. Next:
  - Download the .gguf from the Kaggle Output panel.
  - In Ollama, create it:
        # Modelfile
        FROM ./<the-file>.gguf
        PARAMETER temperature 0.6
    then:  ollama create medimind -f Modelfile
  - Benchmark:  set MEDGEMMA_MODEL=medimind and run benchmark_medical.py
    (medimind vs base medgemma vs claude). Ship only if it's better.
""")
