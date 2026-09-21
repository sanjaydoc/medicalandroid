# MediMind — MedGemma fine-tune

Turn MedGemma 4B into MediMind's own medical model. Full plan (pinned artifact):
datasets, QLoRA, where to train, evaluation.

## Rules
- Only **openly-licensed** datasets + our **own curated** data.
- **Never** train on Claude/GPT outputs (ToS + legal risk).
- No real patient data (PHI) without consent + de-identification.

## Files
- `seed_examples.jsonl` — hand-written **gold** examples in MediMind's voice
  (concise-but-complete, multilingual, safety framing). Grow this with
  doctor-reviewed answers — it's the differentiator.
- `build_dataset.py` — **Step 1.** Pulls open medical Q&A (MedMCQA=India,
  PubMedQA, MedQA-USMLE, MedicationQA), formats to chat JSONL, and weights in
  the seed examples. Produces `train.jsonl` / `val.jsonl`.

## Step 1 — build the data
```bash
pip install datasets
python build_dataset.py      # -> train.jsonl, val.jsonl
```
Tune the `SAMPLES` numbers for a bigger/smaller run.

## Step 2 (next) — QLoRA fine-tune (Kaggle/Colab, free GPU)
Unsloth QLoRA on MedGemma 4B (text side; vision frozen). Starting hyperparams:
rank 16, alpha 32, LR 2e-4, 1–3 epochs, seq 2048. Export to GGUF (q4) → Ollama.

## Step 3 — evaluate
Run `../benchmark/benchmark_medical.py`: fine-tuned vs base MedGemma vs Claude.
Ship only if it improves with **zero dangerous-misses**.
