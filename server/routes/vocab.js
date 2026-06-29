const express = require("express");
const { OpenAI } = require("openai");
const { db } = require("../services/firebaseAdmin");
const { checkUsage } = require("../middleware/checkUsage");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cards live in a per-user Firestore subcollection: users/{uid}/vocab/{cardId}.
// The SRS scheduling itself runs on the client (utils/srs.js); the server only
// persists the resulting card state, so this layer is deliberately thin CRUD.

const cardsRef = (uid) => db.collection("users").doc(uid).collection("vocab");

// Fields a client is allowed to write (front matter + scheduling state).
const WRITABLE = [
  "front", "back", "example", "tags", "source",
  "state", "due", "last_review", "reps", "lapses", "step",
  "stability", "difficulty", "ease", "interval", "_postLapseInterval",
];

function pickWritable(obj = {}) {
  const out = {};
  for (const k of WRITABLE) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

function freshCard(input) {
  const nowIso = new Date().toISOString();
  return {
    front: String(input.front || "").trim(),
    back: String(input.back || "").trim(),
    example: String(input.example || "").trim(),
    tags: Array.isArray(input.tags) ? input.tags.map(String).slice(0, 8) : [],
    source: input.source ? String(input.source) : "manual",
    // Initial SRS state — mirrors client newCardState().
    state: "new",
    due: nowIso,
    last_review: null,
    reps: 0,
    lapses: 0,
    step: 0,
    stability: null,
    difficulty: null,
    ease: 2.5,
    interval: 0,
    createdAt: nowIso,
  };
}

function guardDb(res) {
  if (!db) {
    res.status(503).json({ success: false, error: "Vocabulary storage is not configured on the server." });
    return false;
  }
  return true;
}

// ─── GET /api/vocab — list the user's cards ──────────────────────────
router.get("/", async (req, res, next) => {
  if (!guardDb(res)) return;
  try {
    const snap = await cardsRef(req.uid).orderBy("createdAt", "desc").get();
    const cards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: cards });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/vocab — create one or many cards (deduped by front) ────
// Body: { cards: [{front, back, example, tags, source}] }  OR a single card.
router.post("/", async (req, res, next) => {
  if (!guardDb(res)) return;
  try {
    const incoming = Array.isArray(req.body?.cards)
      ? req.body.cards
      : (req.body?.front ? [req.body] : []);
    const cleaned = incoming
      .map(freshCard)
      .filter((c) => c.front && c.back);

    if (cleaned.length === 0) {
      return res.status(400).json({ success: false, error: "No valid cards provided (need front + back)." });
    }
    if (cleaned.length > 200) {
      return res.status(400).json({ success: false, error: "Too many cards in one request (max 200)." });
    }

    // Dedup against existing fronts (case-insensitive) so re-seeding the
    // starter deck or re-adding a correction can't create duplicates.
    const existing = await cardsRef(req.uid).get();
    const haveFronts = new Set(existing.docs.map((d) => (d.data().front || "").toLowerCase().trim()));

    const batch = db.batch();
    const created = [];
    for (const card of cleaned) {
      const key = card.front.toLowerCase().trim();
      if (haveFronts.has(key)) continue;
      haveFronts.add(key);
      const ref = cardsRef(req.uid).doc();
      batch.set(ref, card);
      created.push({ id: ref.id, ...card });
    }
    if (created.length > 0) await batch.commit();

    res.json({ success: true, data: created, skipped: cleaned.length - created.length });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/vocab/:id — update a card (review result or edit) ───────
router.put("/:id", async (req, res, next) => {
  if (!guardDb(res)) return;
  try {
    const ref = cardsRef(req.uid).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Card not found." });
    }
    const updates = pickWritable(req.body);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: "No updatable fields supplied." });
    }
    await ref.update(updates);
    res.json({ success: true, data: { id: req.params.id, ...doc.data(), ...updates } });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/vocab/:id ───────────────────────────────────────────
router.delete("/:id", async (req, res, next) => {
  if (!guardDb(res)) return;
  try {
    await cardsRef(req.uid).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/vocab/generate — AI-generate a themed deck ────────────
// Returns suggestions (NOT saved). The client reviews then POSTs to save.
// Metered with checkUsage because it calls a paid model.
router.post("/generate", checkUsage, async (req, res, next) => {
  try {
    const topic = String(req.body?.topic || "").trim().slice(0, 80) || "general IELTS";
    const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 10, 1), 20);

    const sys =
      "You generate IELTS vocabulary flashcards. Return ONLY valid JSON: " +
      '{"cards":[{"front":"word or phrase","back":"concise learner-friendly definition","example":"one natural example sentence using the word","tags":["topic","CEFR level like B2/C1"]}]}. ' +
      "Choose useful Band 7-9 words. No markdown, no commentary.";
    const user = `Generate ${count} IELTS vocabulary flashcards about "${topic}". Return ONLY the JSON object.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    let parsed;
    try {
      parsed = JSON.parse(response.choices[0].message.content);
    } catch {
      return res.status(502).json({ success: false, error: "AI returned malformed vocabulary. Please try again." });
    }

    const cards = (Array.isArray(parsed.cards) ? parsed.cards : [])
      .map((c) => ({
        front: String(c.front || "").trim(),
        back: String(c.back || "").trim(),
        example: String(c.example || "").trim(),
        tags: Array.isArray(c.tags) ? c.tags.map(String).slice(0, 4) : [topic],
        source: "ai",
      }))
      .filter((c) => c.front && c.back);

    if (cards.length === 0) {
      return res.status(502).json({ success: false, error: "The generator did not return usable cards. Please try again." });
    }

    res.json({ success: true, data: cards });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
