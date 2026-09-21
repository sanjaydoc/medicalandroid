#!/usr/bin/env python3
"""
MediMind fine-tune — Step 1: build the training dataset.

Pulls a few OPENLY-LICENSED medical Q&A datasets, formats them into chat JSONL
({"messages":[system,user,assistant]}), and weights in your hand-written gold
seed examples (seed_examples.jsonl) so the model learns MediMind's voice, safety
framing and multilingual style.

RULE: only open datasets + your own curated data. NEVER Claude/GPT outputs.

Run (Kaggle / Colab / laptop):
    pip install datasets
    python build_dataset.py
    # -> writes train.jsonl and val.jsonl next to this file

Tune the SAMPLES numbers to make it bigger/smaller. Each source is wrapped in
try/except, so if one won't download the rest still work.
"""
import json
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
random.seed(42)

SYSTEM = ("You are MediMind, an AI medical assistant. Give clear, genuinely useful general "
          "information. Be warm and concise. You are not the treating clinician: no definitive "
          "diagnosis or individualised prescription. Detect the user's language and reply in it. "
          "Lead with emergency advice for red-flag symptoms.")

# How many examples to take from each source (raise for a bigger run).
SAMPLES = {"medmcqa": 3000, "pubmedqa": 1000, "medqa": 2000, "medicationqa": 700}
SEED_WEIGHT = 5   # repeat each gold seed example this many times (style weighting)
VAL_FRACTION = 0.05

rows = []  # list of {"messages":[...]}

def add(user, assistant):
    user = (user or "").strip()
    assistant = (assistant or "").strip()
    if len(user) < 8 or len(assistant) < 20:
        return
    rows.append({"messages": [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": user},
        {"role": "assistant", "content": assistant},
    ]})

def try_load(fn, name):
    try:
        n0 = len(rows)
        fn()
        print(f"  {name}: +{len(rows) - n0}")
    except Exception as e:  # noqa: BLE001
        print(f"  {name}: SKIPPED ({e})")

# ------------------------------------------------------------------ sources ---
def load_medmcqa():
    from datasets import load_dataset
    ds = load_dataset("openlifescienceai/medmcqa", split="train")
    ds = ds.shuffle(seed=42).select(range(min(SAMPLES["medmcqa"], len(ds))))
    letters = ["opa", "opb", "opc", "opd"]
    for r in ds:
        opts = [r["opa"], r["opb"], r["opc"], r["opd"]]
        correct = opts[r["cop"]]
        exp = (r.get("exp") or "").strip()
        ans = f"The most likely answer is **{correct}**." + (f" {exp}" if exp else "")
        add(r["question"], ans)

def load_pubmedqa():
    from datasets import load_dataset
    ds = load_dataset("pubmed_qa", "pqa_labeled", split="train")
    ds = ds.shuffle(seed=42).select(range(min(SAMPLES["pubmedqa"], len(ds))))
    for r in ds:
        add(r["question"], r.get("long_answer"))

def load_medqa():
    from datasets import load_dataset
    ds = load_dataset("GBaker/MedQA-USMLE-4-options", split="train")
    ds = ds.shuffle(seed=42).select(range(min(SAMPLES["medqa"], len(ds))))
    for r in ds:
        ans = r.get("answer") or ""
        add(r["question"], f"The most likely answer is **{ans}**.")

def load_medicationqa():
    from datasets import load_dataset
    ds = load_dataset("truehealth/medicationqa", split="train")
    ds = ds.shuffle(seed=42).select(range(min(SAMPLES["medicationqa"], len(ds))))
    for r in ds:
        q = r.get("Question") or r.get("question")
        a = r.get("Answer") or r.get("answer")
        add(q, a)

print("Loading open datasets…")
try_load(load_medmcqa, "medmcqa (India MCQ)")
try_load(load_pubmedqa, "pubmedqa")
try_load(load_medqa, "medqa (USMLE)")
try_load(load_medicationqa, "medicationqa")

# ------------------------------------------------------- gold seed examples ---
seed_path = HERE / "seed_examples.jsonl"
if seed_path.exists():
    seeds = [json.loads(l) for l in seed_path.read_text("utf-8").splitlines() if l.strip()]
    for _ in range(SEED_WEIGHT):
        rows.extend(seeds)
    print(f"  seed_examples: +{len(seeds) * SEED_WEIGHT} ({len(seeds)} x{SEED_WEIGHT})")

# ------------------------------------------------------------ write splits ---
random.shuffle(rows)
n_val = max(1, int(len(rows) * VAL_FRACTION))
val, train = rows[:n_val], rows[n_val:]

def dump(path, data):
    with open(path, "w", encoding="utf-8") as f:
        for r in data:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

dump(HERE / "train.jsonl", train)
dump(HERE / "val.jsonl", val)
print(f"\nTotal {len(rows)} examples  ->  train {len(train)} / val {len(val)}")
print("Wrote train.jsonl and val.jsonl")
print("Next: Step 2 — QLoRA fine-tune with Unsloth on Kaggle/Colab.")
