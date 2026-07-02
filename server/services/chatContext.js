/**
 * chatContext.js — personalization + memory for the tutor chatbot.
 *
 *  buildStudentProfile(uid)      → a short string injected into the system prompt so
 *                                  the bot tutors to the student's real weaknesses
 *                                  (read from users/{uid}/analytics/summary).
 *  summarizeConversation(...)    → folds older turns into a running summary so the
 *                                  context window (and cost) stays bounded.
 *  assembleMessages(...)         → builds the final messages[] for the completion.
 *
 * Wiring (in routes/chatbot.js): keep the client sending { message, recent, summary }.
 * Build messages with assembleMessages(); if recent got long, call
 * summarizeConversation() after replying and return the new summary to the client.
 */
const { db } = require("./firebaseAdmin");
const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CRIT_LABEL = {
  fc: "Fluency & Coherence",
  lr: "Lexical Resource",
  gra: "Grammatical Range & Accuracy",
  tr: "Task Response",
  cc: "Coherence & Cohesion",
  p: "Pronunciation",
};

const KEEP_RECENT = 8; // turns kept verbatim before older ones get summarised

/**
 * Compact tutor profile from the analytics rollup. Returns '' for new users so the
 * bot just acts as a generic tutor. Tolerant of missing fields — adjust the field
 * paths if your analytics schema differs.
 */
async function buildStudentProfile(uid) {
  if (!db || !uid) return "";
  try {
    const doc = await db.collection("users").doc(uid).collection("analytics").doc("summary").get();
    if (!doc.exists) return "";
    const a = doc.data() || {};
    const bits = [];

    // Weakest criterion (lowest average, needs at least one data point).
    const crit = Object.entries(a.criteria || {}).filter(([, v]) => v && (v.count || 0) > 0 && v.avg != null);
    if (crit.length) {
      crit.sort((x, y) => x[1].avg - y[1].avg);
      const [name, v] = crit[0];
      bits.push(`weakest area is ${CRIT_LABEL[name] || name} (avg band ${Number(v.avg).toFixed(1)})`);
    }

    // Weakest question type across reading/listening (min 5 seen to be meaningful).
    let worst = null;
    for (const section of Object.values(a.qTypes || {})) {
      for (const [type, s] of Object.entries(section || {})) {
        if (!s || (s.seen || 0) < 5) continue;
        const acc = s.correct / s.seen;
        if (!worst || acc < worst.acc) worst = { type, acc };
      }
    }
    if (worst) bits.push(`often misses "${worst.type}" questions (${Math.round(worst.acc * 100)}% correct)`);

    // Top recurring mistake categories.
    const tags = Object.entries(a.mistakeTags || {}).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k]) => k);
    if (tags.length) bits.push(`recurring mistakes: ${tags.join(", ")}`);

    if (!bits.length) return "";
    return `STUDENT PROFILE — This learner's ${bits.join("; ")}. Prioritise these weaknesses and give targeted, concrete help.`;
  } catch (err) {
    console.warn("buildStudentProfile error:", err.message);
    return "";
  }
}

/**
 * Update the running summary with the exchanges about to be evicted from the window.
 * Cheap (gpt-4o-mini). Returns the new summary string.
 */
async function summarizeConversation(previousSummary, olderMessages) {
  if (!olderMessages || olderMessages.length === 0) return previousSummary || "";
  const transcript = olderMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You maintain a brief running summary of a tutoring conversation. Merge the new exchanges into the existing summary. Keep it under 100 words. Capture what the student is working on and any advice already given, so the tutor doesn't repeat itself. Return ONLY the updated summary.",
        },
        {
          role: "user",
          content: `Existing summary:\n${previousSummary || "(none)"}\n\nNew exchanges:\n${transcript}\n\nUpdated summary:`,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });
    return resp.choices[0].message.content.trim();
  } catch (err) {
    console.warn("summarizeConversation error:", err.message);
    return previousSummary || ""; // non-fatal: keep the old summary
  }
}

/**
 * Build the final messages[] for the chat completion.
 * @returns {{ messages: Array, overflow: Array }} overflow = turns that should be
 *          summarised into `summary` after this reply (empty if none).
 */
function assembleMessages({ persona, profile, summary, recent = [], message }) {
  const systemParts = [persona];
  if (profile) systemParts.push(profile);
  if (summary) systemParts.push(`Earlier in this conversation: ${summary}`);

  const overflow = recent.length > KEEP_RECENT ? recent.slice(0, recent.length - KEEP_RECENT) : [];
  const kept = recent.slice(-KEEP_RECENT);

  const messages = [
    { role: "system", content: systemParts.join("\n\n") },
    ...kept,
    { role: "user", content: message },
  ];
  return { messages, overflow };
}

module.exports = { buildStudentProfile, summarizeConversation, assembleMessages, KEEP_RECENT };
