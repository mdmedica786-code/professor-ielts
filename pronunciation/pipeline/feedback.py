"""Generate human-readable pronunciation feedback."""
import numpy as np
from .phone_map import PHONE_DESCRIPTIONS


def generate_feedback(evaluation):
    """
    Turn raw phone scores into actionable student feedback.

    Groups errors by phone type, identifies worst words, and generates
    prioritized feedback items with practice tips.
    """
    # Group errors by phone type
    phone_errors = {}
    for m in evaluation["mispronunciations"]:
        key = m["expected_phone"].rstrip("012")
        phone_errors.setdefault(key, []).append(m)

    feedback_items = []
    for phone, errors in sorted(
        phone_errors.items(), key=lambda x: len(x[1]), reverse=True
    ):
        desc = PHONE_DESCRIPTIONS.get(phone, {})
        words = list(set(e["word"] for e in errors))[:3]
        avg_gop = np.mean([e["gop_score"] for e in errors])

        feedback_items.append({
            "phone": phone,
            "phone_name": desc.get("name", f"/{phone}/"),
            "severity": "high" if avg_gop < -6 else "medium",
            "count": len(errors),
            "affected_words": words,
            "message": (
                f"You mispronounced {desc.get('name', phone)} in "
                f"{', '.join(repr(w) for w in words)} "
                f"({len(errors)} time{'s' if len(errors) > 1 else ''})."
            ),
            "tip": desc.get("tip", "Practice slowly, then speed up."),
            "example_words": desc.get("example", ""),
        })

    # Worst 5 words
    worst = sorted(
        evaluation["word_scores"], key=lambda w: w["score"]
    )[:5]
    worst_words = [
        {"word": w["word"], "score": w["score"]}
        for w in worst if w["score"] < -4.0
    ]

    return {
        "phone_feedback": feedback_items,
        "worst_words": worst_words,
        "band": evaluation["pronunciation_band"],
        "accuracy": f"{evaluation['accuracy_percent']}%",
        "summary": _summary(evaluation, feedback_items)
    }


def _summary(ev, fb):
    """Generate a one-line summary of pronunciation performance."""
    band = ev["pronunciation_band"]
    acc = ev["accuracy_percent"]
    top = fb[0]["phone_name"] if fb else "N/A"
    return (
        f"Pronunciation Band: {band}. Accuracy: {acc}%. "
        f"{'Focus on ' + top + ' for the fastest improvement.' if fb else 'Good job!'}"
    )
