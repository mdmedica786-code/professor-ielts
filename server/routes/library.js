/**
 * library.js — the ONE global deck, served to every signed-in student.
 *
 * Source of truth: Supabase (if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are
 * set and the deck is seeded). Fallback: scripts/makkar_parsed.json on disk —
 * so this route works TODAY, before you've even created the Supabase project.
 *
 * Content is cached in memory (it changes ~never at runtime), so Supabase is
 * hit once per hour max — the "two databases" overhead at request time is nil.
 *
 * Mount in index.js (no checkUsage — reading the library shouldn't burn quota):
 *   app.use("/api/library", verifyAuth, require("./routes/library"));
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const GLOBAL_DECK_SLUG = process.env.GLOBAL_DECK_SLUG || "makkar-may-aug-2023";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const JSON_FALLBACK = path.join(__dirname, "../scripts/makkar_parsed.json");

let cache = null; // { payload, etag, expires }

// ---------- Supabase (lazy, optional) ----------
let supabase = null;
function getSupabase() {
  if (supabase !== null) return supabase;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = false;
    return supabase;
  }
  try {
    const { createClient } = require("@supabase/supabase-js");
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  } catch {
    console.warn("library: @supabase/supabase-js not installed — using JSON fallback.");
    supabase = false;
  }
  return supabase;
}

async function loadFromSupabase() {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: deck, error: deckErr } = await sb
    .from("decks")
    .select("id, slug, title, description, module")
    .eq("slug", GLOBAL_DECK_SLUG)
    .eq("is_published", true)
    .maybeSingle();
  if (deckErr || !deck) return null; // not seeded/published yet -> fallback

  const { data: cards, error: cardErr } = await sb
    .from("cue_cards")
    .select("card_number, title, prompts, sample_answer, followup_questions(position, question, sample_answer)")
    .eq("deck_id", deck.id)
    .order("card_number");
  if (cardErr) throw cardErr;

  return {
    deck: { slug: deck.slug, title: deck.title, description: deck.description, module: deck.module },
    cards: cards.map((c) => ({
      cardNumber: c.card_number,
      title: c.title,
      prompts: c.prompts,
      sampleAnswer: c.sample_answer,
      followUps: (c.followup_questions || [])
        .sort((a, b) => a.position - b.position)
        .map((f) => ({ position: f.position, question: f.question, answer: f.sample_answer })),
    })),
    source: "supabase",
  };
}

function loadFromJson() {
  const cards = JSON.parse(fs.readFileSync(JSON_FALLBACK, "utf8"));
  return {
    deck: {
      slug: GLOBAL_DECK_SLUG,
      title: "Makkar Cue Cards (May–Aug 2023)",
      description: null,
      module: "speaking",
    },
    cards: cards.map((c) => ({
      cardNumber: c.cardNumber,
      title: c.title,
      prompts: c.prompts,
      sampleAnswer: c.sampleAnswer,
      followUps: (c.followUps || []).map((f) => ({
        position: f.position,
        question: f.question,
        answer: f.answer,
      })),
    })),
    source: "json-fallback",
  };
}

async function getDeck() {
  if (cache && cache.expires > Date.now()) return cache;

  let payload;
  try {
    payload = await loadFromSupabase();
  } catch (err) {
    console.warn("library: Supabase read failed, using JSON fallback:", err.message);
  }
  if (!payload) payload = loadFromJson();

  const body = JSON.stringify(payload);
  cache = {
    payload: body,
    etag: `"deck-${payload.source}-${payload.cards.length}-${body.length}"`,
    expires: Date.now() + CACHE_TTL_MS,
  };
  return cache;
}

/** GET /api/library/deck — the whole global deck (~430 KB raw, ~80 KB gzipped). */
router.get("/deck", async (req, res, next) => {
  try {
    const { payload, etag } = await getDeck();
    res.set("Cache-Control", "private, max-age=3600");
    res.set("ETag", etag);
    if (req.headers["if-none-match"] === etag) return res.status(304).end();
    res.type("application/json").send(payload);
  } catch (err) {
    next(err);
  }
});

/** GET /api/library/deck/cards — titles only (light list view for the app). */
router.get("/deck/cards", async (req, res, next) => {
  try {
    const { payload } = await getDeck();
    const { deck, cards } = JSON.parse(payload);
    res.set("Cache-Control", "private, max-age=3600");
    res.json({
      deck,
      cards: cards.map(({ cardNumber, title, prompts }) => ({ cardNumber, title, prompts })),
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/library/deck/cards/:number — one full card (practice screen). */
router.get("/deck/cards/:number", async (req, res, next) => {
  try {
    const { payload } = await getDeck();
    const { cards } = JSON.parse(payload);
    const card = cards.find((c) => c.cardNumber === Number(req.params.number));
    if (!card) return res.status(404).json({ success: false, error: "Card not found" });
    res.set("Cache-Control", "private, max-age=3600");
    res.json(card);
  } catch (err) {
    next(err);
  }
});

/** POST /api/library/refresh — bust the cache after re-seeding content. */
router.post("/refresh", (req, res) => {
  cache = null;
  res.json({ success: true });
});

module.exports = router;
