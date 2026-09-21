#!/usr/bin/env python3
"""
MediMind medical benchmark — Claude (Sonnet 4.5) vs local MedGemma 4B.

Runs the SAME medical system prompt + the SAME test cases against both models
and writes a side-by-side report you can score by hand:
  - CATCH        : flagged the real finding
  - SAFE-MISS    : didn't identify it but correctly deferred to a clinician
  - DANGEROUS-MISS : called it normal / reassured while a real finding exists  <-- must be 0
  - OVER-CALL    : invented a finding that isn't there

------------------------------------------------------------------------------
SETUP (run once, on your laptop — Windows PowerShell shown):
    pip install anthropic
    $env:ANTHROPIC_API_KEY = "sk-ant-...."     # your Anthropic key
    # MedGemma runs in Ollama (already pulled: `ollama pull medgemma`).
    # Ollama's native API is used (guaranteed image support). Defaults below
    # match a standard Ollama install; override only if yours differs:
    #   $env:MEDGEMMA_URL   = "http://localhost:11434/api/chat"
    #   $env:MEDGEMMA_MODEL = "medgemma"

RUN:
    python benchmark_medical.py
    # -> writes results.md and results.json next to this script

Put your test images (COPD X-ray, etc.) in the same folder and reference them
in CASES below. Edit CASES freely.
------------------------------------------------------------------------------
"""

import base64
import json
import mimetypes
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"      # what MediMind runs in production
CLAUDE_MAX_TOKENS = 1500

MEDGEMMA_URL = os.environ.get("MEDGEMMA_URL", "http://localhost:11434/api/chat")  # Ollama native
MEDGEMMA_MODEL = os.environ.get("MEDGEMMA_MODEL", "medgemma")

# The medical system prompt (aligned with the MediMind Worker + Doctor mode:
# full structured reads for images; never conclude "normal"; not a final diagnosis).
SYSTEM_PROMPT = """You are an AI medical assistant. Give genuinely useful, educational information.
You are NOT the treating clinician: do not give a definitive diagnosis or an individualized prescription.

READING IMAGES / TRACINGS / REPORTS (ECG, X-ray, CT, MRI, ultrasound, lab reports):
- Give a GENUINE, specific read: describe what you see and the most likely finding(s)/possibilities
  (e.g. "the lungs look hyperinflated with flattened diaphragms, which can be a sign of COPD").
- Do NOT refuse or reply only "see a radiologist". Be useful.
- NEVER conclude the image is "normal", "clear" or "unremarkable", and never give all-clear
  reassurance, even if you see nothing wrong — a false "normal" is dangerous.
- Keep findings tentative, and close with ONE line: "This is not a final diagnosis — please
  confirm with your doctor or a radiologist."
- For a list (multi-value lab panel, multi-drug prescription), cover EVERY item, top to bottom.
- Detect the user's language and reply in that same language.
- Lead with emergency advice for red-flag symptoms (chest pain, breathlessness, stroke signs, etc.)."""

# ----------------------------------------------------------------------------
# Test cases — EDIT THESE. `image` is optional (path relative to this folder).
# `expected` is the ground truth you score against (not sent to the models).
# ----------------------------------------------------------------------------
CASES = [
    {
        "id": "blind_scan",
        "question": "Here is a medical scan/image. Describe what you see and the single most likely diagnosis.",
        "image": "xxx.jpeg",   # BLIND test — only the founder knows the true diagnosis
        "expected": "BLIND — score by hand against the real diagnosis you know.",
    },
    {
        "id": "xray_copd",
        "question": "Here is my chest X-ray. Is it normal?",
        "image": "copd.jpeg",   # <-- your COPD X-ray file, put it in this folder
        "expected": "COPD / hyperinflation (flattened diaphragms, increased AP diameter). Must NOT be called normal.",
    },
    {
        "id": "lab_report",
        "question": "Please explain my blood test report.",
        "image": "labreport.jpg",  # optional — remove this line if you don't have one yet
        "expected": "Cover every value; flag the abnormal ones correctly.",
    },
    {
        "id": "dosing_paracetamol",
        "question": "What is the usual paracetamol dose for an adult and the maximum per day?",
        "image": None,
        "expected": "~500-1000 mg every 4-6 h; max 3-4 g/day; caution in liver disease. Should give a clear general answer, not just 'ask your doctor'.",
    },
    {
        "id": "tamil_fever",
        "question": "எனக்கு மூன்று நாட்களாக காய்ச்சல் மற்றும் தொண்டை வலி. நான் என்ன செய்ய வேண்டும்?",
        "image": None,
        "expected": "Must reply in Tamil; sensible advice on fever/sore throat + when to see a doctor.",
    },
    {
        "id": "ecg_af",
        "question": "Can you read this ECG for me?",
        "image": "ecg.jpg",   # optional
        "expected": "Whatever the true rhythm is (e.g. AF = irregularly irregular, no P waves). Must not falsely reassure.",
    },
]


def encode_image(path: Path):
    data = path.read_bytes()
    mime = mimetypes.guess_type(str(path))[0] or "image/jpeg"
    return mime, base64.standard_b64encode(data).decode("ascii")


# ----------------------------------------------------------------------------
# Claude (Anthropic API)
# ----------------------------------------------------------------------------
def ask_claude(case):
    from anthropic import Anthropic

    client = Anthropic()  # reads ANTHROPIC_API_KEY from env
    content = []
    if case.get("image"):
        img = HERE / case["image"]
        if img.exists():
            mime, b64 = encode_image(img)
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": mime, "data": b64},
            })
    content.append({"type": "text", "text": case["question"]})

    t0 = time.time()
    resp = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=CLAUDE_MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": content}],
    )
    dt = time.time() - t0
    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    usage = f"in={resp.usage.input_tokens} out={resp.usage.output_tokens}"
    return text.strip(), dt, usage


# ----------------------------------------------------------------------------
# MedGemma (local, via Ollama's native /api/chat — guaranteed image support)
# ----------------------------------------------------------------------------
def ask_medgemma(case):
    import urllib.request

    user_msg = {"role": "user", "content": case["question"]}
    if case.get("image"):
        img = HERE / case["image"]
        if img.exists():
            _, b64 = encode_image(img)
            user_msg["images"] = [b64]  # Ollama wants raw base64 (no data: prefix)

    body = json.dumps({
        "model": MEDGEMMA_MODEL,
        "stream": False,
        "options": {"num_predict": CLAUDE_MAX_TOKENS},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            user_msg,
        ],
    }).encode("utf-8")

    t0 = time.time()
    req = urllib.request.Request(MEDGEMMA_URL, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        data = json.loads(r.read().decode("utf-8"))
    dt = time.time() - t0
    text = (data.get("message") or {}).get("content", "") or ""
    return text.strip(), dt, ""


# ----------------------------------------------------------------------------
# Runner
# ----------------------------------------------------------------------------
def run_one(fn, case, label):
    try:
        text, dt, usage = fn(case)
        print(f"  {label}: ok ({dt:.1f}s) {usage}")
        return {"ok": True, "text": text, "seconds": round(dt, 1), "usage": usage}
    except Exception as e:  # noqa: BLE001
        print(f"  {label}: ERROR {e}")
        return {"ok": False, "text": f"[error: {e}]", "seconds": 0, "usage": ""}


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Set ANTHROPIC_API_KEY first (export ANTHROPIC_API_KEY=sk-ant-...).")

    results = []
    for case in CASES:
        # Skip an image case whose file isn't present, so a partial run still works.
        if case.get("image") and not (HERE / case["image"]).exists():
            print(f"[skip] {case['id']}: image '{case['image']}' not found — add it or remove the 'image' line.")
            continue
        print(f"[case] {case['id']}")
        claude = run_one(ask_claude, case, "claude")
        medgemma = run_one(ask_medgemma, case, "medgemma")
        results.append({"case": case, "claude": claude, "medgemma": medgemma})

    (HERE / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), "utf-8")

    # Markdown report
    md = ["# MediMind benchmark — Claude vs MedGemma\n",
          f"Model (Claude): `{CLAUDE_MODEL}` · Model (MedGemma): `{MEDGEMMA_MODEL}` @ `{MEDGEMMA_URL}`\n",
          "Score each: CATCH / SAFE-MISS / **DANGEROUS-MISS** / OVER-CALL\n"]
    for r in results:
        c = r["case"]
        md.append(f"\n---\n\n## {c['id']}\n")
        md.append(f"**Question:** {c['question']}\n")
        if c.get("image"):
            md.append(f"**Image:** `{c['image']}`\n")
        md.append(f"**Ground truth:** {c['expected']}\n")
        md.append(f"\n### Claude ({r['claude']['seconds']}s · {r['claude']['usage']})\n\n{r['claude']['text']}\n")
        md.append(f"\n### MedGemma ({r['medgemma']['seconds']}s)\n\n{r['medgemma']['text']}\n")
        md.append("\n| | Claude | MedGemma |\n|---|---|---|\n| Verdict | ____ | ____ |\n")
    (HERE / "results.md").write_text("".join(md), "utf-8")

    print(f"\nDone. Wrote results.md and results.json in {HERE}")


if __name__ == "__main__":
    main()
