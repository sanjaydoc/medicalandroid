---
license: other
license_name: health-ai-developer-foundations
license_link: https://developers.google.com/health-ai-developer-foundations/terms
base_model: google/medgemma-4b-it
library_name: gguf
pipeline_tag: image-text-to-text
tags:
  - medical
  - medgemma
  - gemma
  - healthcare
  - multilingual
  - gguf
  - ollama
  - lora
language:
  - en
  - ta
  - hi
---

# MedDroid-v9

A **style-tuned** fine-tune of Google's **[MedGemma 4B](https://huggingface.co/google/medgemma-4b-it)** for the **MedDroid** AI medical assistant ([medicalandroid.com](https://medicalandroid.com)). It keeps MedGemma's medical knowledge and image-reading, and adds a warmer, more structured, **multilingual** (English / தமிழ் / हिन्दी) voice.

> ⚠️ **Educational use only — NOT a medical device and NOT for clinical decision-making.**
> MedDroid-v9 provides **general health information, not a diagnosis or a prescription.** It can be wrong. Always consult a qualified doctor or pharmacist. In an emergency, contact your local emergency number.

---

## What it is

MedGemma 4B is already strong at medical text and medical imaging. Our benchmark showed its real gaps versus a frontier model were **language and presentation** — not knowledge:

- It answered Indian-language questions **in English**
- Answers were **terse** and inconsistently structured
- Safety framing ("not a diagnosis", red-flags) was hit-or-miss

Earlier attempts to fix this by fine-tuning on medical Q&A **corrupted the model's drug-dosing facts** (a known risk of SFT on small models). So **MedDroid-v9 was trained on language + tone/format examples ONLY, with zero dose numbers or hard facts in the data** — there is nothing factual for the fine-tune to overwrite. The vision tower is **frozen**.

## What improved (vs base MedGemma)

| Dimension | Base MedGemma | MedDroid-v9 |
|---|---|---|
| Tamil / Hindi questions | answered in English | **answers in the same language** ✅ |
| Structure & depth | terse | **headings, bullets, "when to see a doctor"** ✅ |
| Safety framing | inconsistent | **consistent "not a diagnosis" + red-flags** ✅ |
| Chest X-ray (COPD) | correct | **still correct** (hyperinflation → COPD) ✅ |
| Paracetamol dose | correct (4 g) | **still correct (4 g)** ✅ |
| Dangerous errors on our benchmark | 0 | **0** ✅ |

## ⚠️ Known limitations

- **Exact drug dosing can be imprecise.** Common doses (e.g. paracetamol) are reliable, but the model may be **imprecise for specific drugs** (e.g. it confused amoxicillin with a co-amoxiclav figure). **Do not rely on it for exact dosing** — MedDroid pairs it with retrieval/guardrails and a frontier-model fallback for dosing in production.
- It is a **4B model**: less capable than frontier models on long, complex reasoning.
- It can **hallucinate** and occasionally appends slightly off boilerplate. Treat every output as general information to verify with a clinician.
- Not evaluated for any regulated clinical purpose; **no ISO/CLIA/CDSCO/FDA validation.**

## Intended use

- Consumer health **education**: explaining symptoms, medicines, lab reports and scans in plain language, in English/Tamil/Hindi.
- A component in a **compound system** (with retrieval for facts and a frontier-model fallback), not a standalone clinical tool.

**Out of scope:** diagnosis, treatment decisions, prescribing, emergency triage as a sole source, or any clinical/regulated use.

## How to use

This repo ships GGUF files — the language model **and** the vision projector (`mmproj`) for image input.

### Ollama
Create a `Modelfile` next to the two `.gguf` files (both `FROM` lines enable vision):

```
FROM ./medgemma-4b-it.Q4_K_M.gguf
FROM ./medgemma-4b-it.F16-mmproj.gguf
PARAMETER temperature 0.6
PARAMETER num_ctx 4096
SYSTEM """You are MedDroid, an AI medical assistant. Give clear, genuinely useful general information. Be warm and concise. You are not the treating clinician: no definitive diagnosis or individualised prescription. Detect the user's language and reply in it. Lead with emergency advice for red-flag symptoms."""
```
```bash
ollama create meddroid-v9 -f Modelfile
ollama run meddroid-v9 "எனக்கு காய்ச்சல் மற்றும் தொண்டை வலி. என்ன செய்ய வேண்டும்?"
```

### llama.cpp (with vision)
```bash
llama-mtmd-cli -m medgemma-4b-it.Q4_K_M.gguf --mmproj medgemma-4b-it.F16-mmproj.gguf
```

## Training

- **Method:** QLoRA (Unsloth), 4-bit base, LoRA on language layers only; **vision tower frozen**.
- **Data:** ~24 hand-written **language + tone/format** examples (English/Tamil/Hindi), weighted; **no dose numbers or factual medical claims** (by design).
- **Hyperparameters:** rank 8, alpha 16, dropout 0.05, LR 2e-5, 3 epochs, cosine schedule, seq len 2048.
- **Hardware:** free Kaggle T4 ×2.
- **Data policy:** open/own data only. No outputs of other proprietary models were used for training.

## License & attribution

MedDroid-v9 is a derivative of **google/medgemma-4b-it** and is distributed under the **Health AI Developer Foundations (HAI-DEF) terms** — see the license link above. By using this model you agree to those terms, including the **prohibited-use policy**. This model is **not affiliated with or endorsed by Google or Anthropic.**

## Citation

**Author:** Dr. Sanjay Anbu — MedDroid ([medicalandroid.com](https://medicalandroid.com))
Built on Google MedGemma 4B. Educational project; not a certified medical device.
