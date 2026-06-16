"""
Professor IELTS Pronunciation Scorer — FastAPI Server

Loads the Wav2Vec2 model once at startup and serves pronunciation
evaluation requests via POST /evaluate.
"""
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os

from pipeline.evaluator import evaluate_pronunciation
from pipeline.feedback import generate_feedback

app = FastAPI(
    title="Professor IELTS Pronunciation Scorer",
    description="Phoneme-level pronunciation scoring using MFA + Wav2Vec2 GOP pipeline",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Load models once at startup (critical for performance — Wav2Vec2 takes 15-30s to load)
from pipeline.scorer import PhoneScorer
scorer = PhoneScorer()


@app.post("/evaluate")
async def evaluate(
    audio: UploadFile = File(...),
    transcript: str = Form(...),
    words: str = Form("[]")
):
    """
    Evaluate pronunciation of audio against the provided transcript.

    Returns word-level and phoneme-level GOP scores, IELTS band mapping,
    mispronunciation details, fluency metrics, and actionable feedback.
    """
    suffix = os.path.splitext(audio.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        import json
        groq_words = json.loads(words)
        result = evaluate_pronunciation(tmp_path, transcript, groq_words, scorer)
        feedback = generate_feedback(result)
        return {"success": True, "data": {**result, "feedback": feedback}}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/health")
async def health():
    """Health check endpoint — verifies model is loaded."""
    return {"status": "ok", "model_loaded": scorer is not None}
