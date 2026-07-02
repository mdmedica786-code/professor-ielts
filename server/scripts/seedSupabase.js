/**
 * seedSupabase.js
 * Bulk-inserts makkar_parsed.json into Supabase.
 *
 * Prereqs:
 *   npm i @supabase/supabase-js
 *   .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (service role = bypasses RLS; server only!)
 *
 * Usage:
 *   node seedSupabase.js                            # seeds makkar deck
 *   node seedSupabase.js --file other.json --deck-slug speaking-actual-2020 --deck-title "2020 Speaking Actual Tests"
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
};

const FILE = path.resolve(__dirname, opt('file', 'makkar_parsed.json'));
const DECK_SLUG = opt('deck-slug', 'makkar-may-aug-2023');
const DECK_TITLE = opt('deck-title', 'Makkar Cue Cards (May–Aug 2023)');
const CHUNK = 100;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

(async () => {
  const cards = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  console.log(`Seeding ${cards.length} cards from ${path.basename(FILE)}`);

  // 1) Upsert the deck (idempotent — safe to re-run).
  const { data: deck, error: deckErr } = await supabase
    .from('decks')
    .upsert(
      { slug: DECK_SLUG, title: DECK_TITLE, module: 'speaking', source: path.basename(FILE), is_published: false },
      { onConflict: 'slug' }
    )
    .select()
    .single();
  if (deckErr) throw deckErr;
  console.log(`Deck: ${deck.id} (${deck.slug})`);

  // 2) Upsert cue cards in chunks; (deck_id, card_number) makes re-runs idempotent.
  const rows = cards.map((c) => ({
    deck_id: deck.id,
    card_number: c.cardNumber,
    title: c.title,
    prompts: c.prompts,
    sample_answer: c.sampleAnswer || null,
    needs_review: !!c.needsReview,
  }));

  const idByNumber = new Map();
  for (const batch of chunks(rows, CHUNK)) {
    const { data, error } = await supabase
      .from('cue_cards')
      .upsert(batch, { onConflict: 'deck_id,card_number' })
      .select('id, card_number');
    if (error) throw error;
    data.forEach((r) => idByNumber.set(r.card_number, r.id));
    console.log(`  cue_cards: +${data.length}`);
  }

  // 3) Replace follow-ups per card (delete-then-insert keeps re-runs clean).
  const fuRows = [];
  for (const c of cards) {
    const cardId = idByNumber.get(c.cardNumber);
    if (!cardId) continue;
    (c.followUps || []).forEach((f, i) =>
      fuRows.push({ cue_card_id: cardId, position: f.position ?? i + 1, question: f.question, sample_answer: f.answer || null })
    );
  }
  const { error: delErr } = await supabase
    .from('followup_questions')
    .delete()
    .in('cue_card_id', [...idByNumber.values()]);
  if (delErr) throw delErr;

  for (const batch of chunks(fuRows, CHUNK)) {
    const { error } = await supabase.from('followup_questions').insert(batch);
    if (error) throw error;
    console.log(`  followup_questions: +${batch.length}`);
  }

  console.log(`\nDone. ${rows.length} cards, ${fuRows.length} follow-ups.`);
  console.log(`Review flagged cards, then publish: update decks set is_published = true where slug = '${DECK_SLUG}';`);
})().catch((e) => {
  console.error('Seed failed:', e.message || e);
  process.exit(1);
});
