const express = require("express");
const {
  generateListeningScript,
  synthesizeAllAudio,
  evaluateListening,
  toPublicSection,
} = require("../services/listeningService");

const router = express.Router();

// We carry the answer key + section metadata through the session via an opaque
// base64 token (same pattern as reading.js). It is NOT security — just keeps
// the answers out of the visible question paper for a self-study tool.
function encodeToken(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}
function decodeToken(token) {
  return JSON.parse(Buffer.from(token, "base64").toString("utf8"));
}

/**
 * POST /api/listening/generate
 * Body: { size, whichSection, topic, difficulty }
 *   - size: 'full' (4 sections, 40 Qs) or 'section' (1 section, 10 Qs)
 *   - whichSection: 1|2|3|4 — only when size==='section'
 *   - topic: optional scenario hint
 *   - difficulty: target band range, e.g. '6.0–7.0'
 *
 * Returns: { title, size, sections (public, with audioBase64 per utterance), token }
 */
router.post("/generate", async (req, res, next) => {
  try {
    const { size, whichSection, topic, difficulty } = req.body || {};

    // Build the script + key.
    const script = await generateListeningScript({ size, whichSection, topic, difficulty });

    if (!script.sections.length) {
      return res.status(502).json({
        success: false,
        error: "The generator did not return a usable test. Please try again.",
      });
    }

    // Synthesize TTS audio for every utterance. This is the slow step.
    const withAudio = await synthesizeAllAudio(script);

    // Token holds the FULL key-bearing script (no audio — that lives only in the
    // response payload to the client). Re-encoded at /evaluate time without audio
    // by stripping audioBase64.
    const tokenPayload = {
      title: withAudio.title,
      size: withAudio.size,
      sections: withAudio.sections.map((s) => ({
        ...s,
        utterances: s.utterances.map(({ audioBase64, mime, ...rest }) => rest),
      })),
    };
    const token = encodeToken(tokenPayload);

    res.json({
      success: true,
      data: {
        title: withAudio.title,
        size: withAudio.size,
        sections: withAudio.sections.map(toPublicSection),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/listening/evaluate
 * Body: { token, answers, studentName }
 * Marks the attempt server-side using the key in the token.
 */
router.post("/evaluate", async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { token, answers, studentName } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, error: "Missing listening session token." });
    }

    let payload;
    try {
      payload = decodeToken(token);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid listening session token." });
    }

    if (!Array.isArray(payload.sections) || payload.sections.length === 0) {
      return res.status(400).json({ success: false, error: "No sections to mark." });
    }

    const result = await evaluateListening({ script: payload, answers: answers || {} });

    result.metadata = {
      studentName: studentName || "Student",
      processingTime: (Date.now() - startTime) / 1000,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `Listening evaluation complete: band=${result.overallBand}, ${result.correctCount}/${result.total} correct, size=${result.size}, time=${result.metadata.processingTime}s`
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
