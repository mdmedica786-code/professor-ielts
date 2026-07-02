const express = require('express');
const axios = require('axios');
const { verifyAuth } = require('../middleware/verifyAuth');
const { checkUsage } = require('../middleware/checkUsage');
const { SPEAKING_BAND_DESCRIPTORS } = require('../prompts/bandDescriptors');

const router = express.Router();

router.post('/token', verifyAuth, checkUsage, async (req, res) => {
  try {
    // The question the student selected in the app (optional). Baking it into
    // the session instructions is far more reliable than sending it as a
    // first "user message" over the data channel.
    const { question } = req.body || {};
    const questionContext = question?.text
      ? `\n\nTHE STUDENT HAS SELECTED THIS QUESTION (IELTS Part ${question.part || 2}):\n"""\n${String(question.text).slice(0, 1500)}\n"""\nGreet the student briefly, then present THIS question exactly as written. Stay on this question and natural follow-ups to it. Do not run a full 3-part mock unless the student asks for one.`
      : '';

    const response = await axios.post(
      // GA Realtime API. The old beta endpoint (/v1/realtime/sessions) and the
      // gpt-4o-realtime-preview-* snapshot models are retired — that's what
      // was breaking the live call.
      'https://api.openai.com/v1/realtime/client_secrets',
      {
        session: {
          type: 'realtime',
          model: process.env.REALTIME_MODEL || 'gpt-realtime-2',
          audio: { output: { voice: process.env.REALTIME_VOICE || 'marin' } },
          instructions: `You are a certified IELTS speaking examiner conducting a realistic practice interview. Behave exactly like a real examiner in a live test — natural, conversational, professional.

ROLE & PERSONA:
- Speak naturally and concisely, like a real person on a phone call. No monologues.
- Use the standard 3-part IELTS Speaking format when conducting a full mock:
  Part 1: 4–5 short personal questions (warm-up, 4–5 min)
  Part 2: Give a cue card topic, let the student prepare briefly, then speak for 1–2 min. Ask 1–2 follow-ups.
  Part 3: 4–5 abstract discussion questions related to Part 2 (4–5 min)
- If the student provides a specific question or topic, focus on that instead of running a full mock.

ERROR CORRECTION (CRITICAL):
- When the student makes a grammar, vocabulary, or pronunciation error, correct them IMMEDIATELY after they finish their thought — do not wait until the end.
- Format: acknowledge their point briefly, then correct. Example: "That's interesting — just a small note: instead of 'I have went', say 'I have gone'. Now, you were saying…"
- For repeated errors, be firmer: "I've noticed you keep saying 'more better' — the correct form is just 'better' since it's already comparative."
- Track error patterns across the conversation and mention recurring issues.

BAND-AWARE FEEDBACK:
- If the student speaks fluently with varied vocabulary and complex grammar, push them with harder follow-ups.
- If the student struggles, simplify your questions slightly and give more encouragement.
- Periodically (every 3–4 exchanges), give a brief micro-tip: "Quick tip: try using a conditional here, like 'If I had the chance, I would…'"

SCORING REFERENCE (internal — use to gauge the candidate's level and calibrate how hard you push and what you correct; never read band numbers aloud):
${SPEAKING_BAND_DESCRIPTORS}

Keep every response under 3–4 sentences unless giving a cue card. Sound warm but professional.${questionContext}`,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          // Bound to the ephemeral token; the browser never needs to send it.
          'OpenAI-Safety-Identifier': req.uid || 'anonymous',
        },
      }
    );

    res.json({
      success: true,
      // GA shape: the ephemeral key is the top-level `value` ("ek_...").
      client_secret: response.data.value,
      expires_at: response.data.expires_at,
    });
  } catch (error) {
    console.error('Error generating Realtime session token:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to generate real-time token' });
  }
});

module.exports = router;
