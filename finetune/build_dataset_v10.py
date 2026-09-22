#!/usr/bin/env python3
"""
MedDroid v10 — Step 1: build a STYLE-ONLY dataset.

Uses ONLY lang_tone_seeds.jsonl (language + tone/format demonstrations, no dose
numbers or hard facts). No open medical datasets — nothing factual to corrupt.
The whole hypothesis: if there are no facts in the data, a gentle LoRA can teach
language + structure WITHOUT damaging MedGemma's knowledge (the v3/v6 failure).

Run:  python build_dataset_v10.py   # -> train.jsonl + val.jsonl
"""
import json
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
random.seed(42)

SEED_WEIGHT = 12          # repeat each style seed this many times
VAL_FRACTION = 0.06

seed_path = HERE / "lang_tone_seeds.jsonl"
seeds = [json.loads(l) for l in seed_path.read_text("utf-8").splitlines() if l.strip()]
print(f"loaded {len(seeds)} style seeds")

rows = []
for _ in range(SEED_WEIGHT):
    rows.extend(seeds)
random.shuffle(rows)

n_val = max(1, int(len(rows) * VAL_FRACTION))
val, train = rows[:n_val], rows[n_val:]

def dump(path, data):
    with open(path, "w", encoding="utf-8") as f:
        for r in data:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

dump(HERE / "train.jsonl", train)
dump(HERE / "val.jsonl", val)
print(f"Total {len(rows)} ({len(seeds)} x{SEED_WEIGHT})  ->  train {len(train)} / val {len(val)}")
print("Wrote train.jsonl and val.jsonl (style-only, no facts).")
