#!/usr/bin/env python3
"""
MedDroid fine-tune — Step 1: build the training dataset (v6 recipe).

v3 lesson: large MULTIPLE-CHOICE sets (medmcqa/medqa) taught a terse
"the answer is X" style and CORRUPTED MedGemma's factual grounding (it gave an
8 g/day paracetamol dose and missed a COPD X-ray). v6 fixes this:
  - DROP the MCQ datasets entirely.
  - Use conversational prose only: real doctor-patient Q&A (ChatDoctor),
    medication Q&A, and a little PubMedQA for grounding.
  - Weight the hand-written MedDroid gold seeds heavily so the model learns the
    VOICE + safety framing without the generic data overwriting its knowledge.

RULE: only open datasets + your own curated data. NEVER Claude/GPT outputs.

Run:
    pip install datasets
    python build_dataset.py           # -> train.jsonl + val.jsonl
"""
import json
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
random.seed(42)

SYSTEM = ("You are MedDroid, an AI medical assistant. Give clear, genuinely useful general "
          "information. Be warm and concise. You are not the treating clinician: no definitive "
          "diagnosis or individualised prescription. Detect the user's language and reply in it. "
          "Lead with emergency advice for red-flag symptoms.")

# Conversational / prose sources only — NO multiple-choice sets.
SAMPLES = {"chatdoctor": 2200, "medicationqa": 700, "pubmedqa": 400}
SEED_WEIGHT = 14        # repeat each gold seed this many times (strong voice weighting)
VAL_FRACTION = 0.05

rows = []

def add(user, assistant):
    user = (user or "").strip()
    assistant = (assistant or "").strip()
    # keep substantive prose only; skip stubs and very short answers
    if len(user) < 12 or len(assistant) < 40:
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
def load_chatdoctor():
    # Real patient question -> doctor answer (HealthCareMagic). Conversational.
    from datasets import load_dataset
    ds = load_dataset("lavita/ChatDoctor-HealthCareMagic-100k", split="train")
    ds = ds.shuffle(seed=42).select(range(min(SAMPLES["chatdoctor"], len(ds))))
    for r in ds:
        q = (r.get("input") or "").strip()
        a = (r.get("output") or "").strip()
        if a and len(a) > 40:
            add(q, a)

def load_medicationqa():
    from datasets import load_dataset
    ds = load_dataset("truehealth/medicationqa", split="train")
    ds = ds.shuffle(seed=42).select(range(min(SAMPLES["medicationqa"], len(ds))))
    for r in ds:
        q = r.get("Question") or r.get("question")
        a = r.get("Answer") or r.get("answer")
        add(q, a)

def load_pubmedqa():
    from datasets import load_dataset
    ds = load_dataset("pubmed_qa", "pqa_labeled", split="train")
    ds = ds.shuffle(seed=42).select(range(min(SAMPLES["pubmedqa"], len(ds))))
    for r in ds:
        add(r["question"], r.get("long_answer"))

print("Loading open conversational datasets (no MCQ)…")
try_load(load_chatdoctor, "chatdoctor (patient-doctor)")
try_load(load_medicationqa, "medicationqa")
try_load(load_pubmedqa, "pubmedqa")

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
print("Next: Step 2 — QLoRA fine-tune with Unsloth (v6: low LR, 3 epochs).")
