"""Full pronunciation evaluation pipeline orchestrator."""
import numpy as np
from .aligner import get_word_phones, prepare_audio
from .scorer import PhoneScorer


def evaluate_pronunciation(audio_path, transcript, groq_words, scorer):
    """
    Complete pronunciation evaluation pipeline.

    Steps:
        1. Prepare audio (16kHz mono WAV, normalized)
        2. Run Native Aligner with Groq timestamps → word + phone boundaries
        3. Get Wav2Vec2 frame-level posteriors
        4. Score each phone via GOP, group by word
        5. Compute overall score + IELTS band mapping
        6. Extract fluency features (speech rate, pauses)

    Args:
        audio_path: Path to the audio file
        transcript: Text transcript of the audio
        groq_words: List of words with timestamps from Whisper
        scorer: Pre-loaded PhoneScorer instance

    Returns:
        Dict with overall_gop, pronunciation_band, word_scores,
        mispronunciations, fluency, and accuracy metrics.
    """
    # Step 1: Prepare audio
    prepared_path, _ = prepare_audio(audio_path)

    # Step 2: Extract words and phones based on Whisper timings
    words, phones = get_word_phones(groq_words)
    
    if not words:
        raise ValueError("No word timings available. Ensure transcription succeeded.")

    # Step 3: Wav2Vec2 posteriors
    probs, frame_dur = scorer.get_posteriors(prepared_path)

    # Step 4: Score each phone, group by word
    word_phone_map = _map_phones_to_words(words, phones)
    all_gops = []
    mispronunciations = []
    word_scores = []

    for wp in word_phone_map:
        phone_results = []
        for p in wp["phones"]:
            gop, predicted, status = scorer.score_phone(
                probs, frame_dur, p["label"], p["start"], p["end"]
            )
            phone_results.append({
                "phone": p["label"],
                "gop": round(gop, 3),
                "status": status,
                "start": p["start"],
                "end": p["end"]
            })
            all_gops.append(gop)

            if status == "mispronounced":
                top = max(predicted, key=predicted.get) if predicted else "?"
                mispronunciations.append({
                    "word": wp["word"],
                    "expected_phone": p["label"],
                    "likely_produced": top,
                    "gop_score": round(gop, 3),
                    "timestamp": round(p["start"], 2)
                })

        word_gop = (
            np.mean([pr["gop"] for pr in phone_results])
            if phone_results else 0
        )
        word_scores.append({
            "word": wp["word"],
            "score": round(float(word_gop), 3),
            "start": wp["start"],
            "end": wp["end"],
            "phones": phone_results
        })

    # Step 5: Overall score + IELTS band
    overall_gop = float(np.mean(all_gops)) if all_gops else 0
    error_rate = len(mispronunciations) / max(len(phones), 1)
    band, descriptor = _gop_to_band(overall_gop, error_rate)

    # Step 6: Fluency features
    fluency = _extract_fluency(words)

    return {
        "overall_gop": round(overall_gop, 3),
        "pronunciation_band": band,
        "band_descriptor": descriptor,
        "accuracy_percent": round((1 - error_rate) * 100, 1),
        "word_scores": word_scores,
        "mispronunciations": mispronunciations,
        "total_words": len(words),
        "total_phones": len(phones),
        "error_rate": round(error_rate, 3),
        "fluency": fluency
    }


def _map_phones_to_words(words, phones):
    """Map phone intervals to their parent words based on timestamps."""
    result = []
    for w in words:
        w_phones = [
            p for p in phones
            if p["start"] >= w["start"] - 0.01
            and p["end"] <= w["end"] + 0.01
        ]
        result.append({
            "word": w["label"],
            "start": w["start"],
            "end": w["end"],
            "phones": w_phones
        })
    return result


def _gop_to_band(gop, error_rate):
    """Map overall GOP score and error rate to IELTS pronunciation band."""
    # Calibrated to realistic spoken-English standards. Phone boundaries are
    # approximated (no true forced alignment), so GOP is noisy and slightly
    # pessimistic — thresholds give clear speech the benefit of the doubt and
    # allow a full Band 9 rather than capping at 8.
    if gop > -2.0 and error_rate < 0.10:
        return 9.0, "Effortless, near-native pronunciation; sounds are consistently clear."
    elif gop > -3.0 and error_rate < 0.18:
        return 8.0, "Highly intelligible throughout; only occasional minor slips."
    elif gop > -4.0 and error_rate < 0.28:
        return 7.0, (
            "Good pronunciation. Generally easy to understand "
            "with minor L1 traces."
        )
    elif gop > -5.5 and error_rate < 0.42:
        return 6.0, (
            "Adequate pronunciation. Generally understood, "
            "some mispronunciations reduce clarity."
        )
    elif gop > -7.0 and error_rate < 0.55:
        return 5.0, (
            "Limited accuracy. Frequent mispronunciations "
            "require listener effort."
        )
    else:
        return 4.0, (
            "Significant pronunciation difficulties causing "
            "considerable listener strain."
        )


def _extract_fluency(words):
    """Extract fluency metrics from word timing data."""
    if not words:
        return {}

    duration = words[-1]["end"] - words[0]["start"]
    wpm = (len(words) / duration) * 60 if duration > 0 else 0

    pauses = []
    for i in range(1, len(words)):
        gap = words[i]["start"] - words[i - 1]["end"]
        if gap > 0.3:
            pauses.append({
                "duration": round(gap, 2),
                "after_word": words[i - 1]["label"],
                "type": "long" if gap > 1.0 else "short"
            })

    if 120 <= wpm <= 160:
        note = "Natural pace"
    elif wpm > 180:
        note = "Too fast"
    elif wpm < 100:
        note = "Slow — possible hesitation"
    else:
        note = "Slightly slow"

    return {
        "speech_rate_wpm": round(wpm, 1),
        "total_pauses": len(pauses),
        "long_pauses": len([p for p in pauses if p["type"] == "long"]),
        "pauses": pauses,
        "note": note
    }
