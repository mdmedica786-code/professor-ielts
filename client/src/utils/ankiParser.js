import initSqlJs from 'sql.js/dist/sql-wasm-browser.js';
import JSZip from 'jszip';

/**
 * Parse an Anki .apkg file and return all data needed to seed the vocab store.
 *
 * Returns:
 *   models    — { [mid]: modelObj } — note type definitions (fields + templates + CSS)
 *   parsedDecks — array of { id, name, conf, cards[] } — one entry per Anki sub-deck
 *   cards     — flat array of ALL card objects (with full Anki scheduling fields preserved)
 *   mediaFiles — { filename: Blob } map of every media asset
 */
export async function parseApkg(file) {
  // 1. Load the ZIP
  const zip = new JSZip();
  await zip.loadAsync(file);

  // 2. Find the SQLite database
  let dbFile = zip.file('collection.anki21') || zip.file('collection.anki2');
  if (!dbFile) throw new Error('Invalid .apkg: no collection.anki2 found');
  const dbData = await dbFile.async('uint8array');

  // 3. Open sql.js
  const SQL = await initSqlJs({ locateFile: f => `/${f}` });
  const db = new SQL.Database(dbData);

  // 4. Read the collection row — contains models, decks, dconf as JSON
  const colRow = db.exec('SELECT models, decks, dconf FROM col')[0].values[0];
  const modelsRaw  = JSON.parse(colRow[0]);
  const decksRaw   = JSON.parse(colRow[1]);
  const dconfRaw   = JSON.parse(colRow[2]);

  // Normalize models map: key by numeric id
  const models = {};
  for (const m of Object.values(modelsRaw)) {
    models[String(m.id)] = m;
  }

  // Build a map: did -> deckConf (new/rev limits etc.)
  const deckConfMap = {};
  for (const [did, deck] of Object.entries(decksRaw)) {
    if (did === '1') continue; // skip the default placeholder
    const conf = dconfRaw[String(deck.conf)] || dconfRaw['1'] || {};
    deckConfMap[did] = {
      id: did,
      name: deck.name,
      newPerDay:  conf.new?.perDay  ?? 20,
      revPerDay:  conf.rev?.perDay  ?? 100,
      newOrder:   conf.new?.order   ?? 1,   // 0=random, 1=due order
      learningSteps: conf.new?.delays ?? [1, 10],  // minutes
      relearningSteps: conf.lapse?.delays ?? [10],
      initialFactor: conf.new?.initialFactor ?? 2500,
    };
  }

  // If no real sub-decks found, use the root deck
  if (Object.keys(deckConfMap).length === 0) {
    const conf = dconfRaw['1'] || {};
    deckConfMap['1'] = {
      id: '1',
      name: file.name?.replace('.apkg', '') || 'Deck',
      newPerDay: conf.new?.perDay ?? 20,
      revPerDay: conf.rev?.perDay ?? 100,
      newOrder: conf.new?.order ?? 1,
      learningSteps: conf.new?.delays ?? [1, 10],
      relearningSteps: conf.lapse?.delays ?? [10],
      initialFactor: conf.new?.initialFactor ?? 2500,
    };
  }

  // 5. Extract notes and cards with full Anki scheduling state
  const cardsQuery = db.exec(`
    SELECT
      c.id, c.nid, c.did, c.ord,
      c.type, c.queue, c.due, c.ivl, c.factor, c.reps, c.lapses, c.left,
      n.mid, n.flds, n.tags
    FROM cards c
    JOIN notes n ON c.nid = n.id
    ORDER BY c.due ASC
  `);

  // Cards grouped by deck id
  const cardsByDeck = {};
  const allCards = [];

  if (cardsQuery.length > 0) {
    const cols = cardsQuery[0].columns;
    for (const row of cardsQuery[0].values) {
      const raw = {};
      cols.forEach((c, i) => { raw[c] = row[i]; });

      // Convert original Anki card state to our scheduling superset
      const card = mapAnkiCard(raw);
      allCards.push(card);

      const did = String(raw.did);
      if (!cardsByDeck[did]) cardsByDeck[did] = [];
      cardsByDeck[did].push(card);
    }
  }

  // Build parsedDecks array
  const parsedDecks = Object.values(deckConfMap).map(deckConf => ({
    ...deckConf,
    cards: cardsByDeck[deckConf.id] || [],
  })).filter(d => d.cards.length > 0);

  // Fall back: all cards under first deck if none matched
  if (parsedDecks.length === 0 && allCards.length > 0) {
    const firstConf = Object.values(deckConfMap)[0];
    parsedDecks.push({ ...firstConf, cards: allCards });
  }

  db.close();

  // 6. Media
  const mediaFile = zip.file('media');
  let mediaMap = {};
  if (mediaFile) {
    try { mediaMap = JSON.parse(await mediaFile.async('string')); } catch {}
  }
  const mediaFiles = {};
  for (const [zipKey, filename] of Object.entries(mediaMap)) {
    const mf = zip.file(zipKey);
    if (mf) mediaFiles[filename] = await mf.async('blob');
  }

  return { models, parsedDecks, cards: allCards, mediaFiles };
}

// ─── Map a raw Anki SQLite card row to our scheduling superset ────────────────
// Anki card.type: 0=new, 1=learning, 2=review, 3=relearning
// Anki card.queue: -3=sched buried, -2=user buried, -1=suspended, 0=new, 1=learning, 2=review, 3=day-learn, 4=preview
function mapAnkiCard(raw) {
  const now = Date.now();
  const SECS = 1000;
  const DAY_MS = 86400 * SECS;

  let state, due;

  switch (raw.type) {
    case 1:  // learning
      state = 'learning';
      // due is epoch seconds for learning cards
      due = new Date(raw.due * SECS).toISOString();
      break;
    case 2:  // review
      state = 'review';
      // due is days since collection creation (we approximate from today)
      // Anki stores review due as a day number. We treat it as days from now.
      due = new Date(now + raw.due * DAY_MS).toISOString();
      break;
    case 3:  // relearning
      state = 'relearning';
      due = new Date(raw.due * SECS).toISOString();
      break;
    default: // 0 = new
      state = 'new';
      due = new Date(now).toISOString();
  }

  return {
    id:          String(raw.id),
    nid:         String(raw.nid),
    did:         String(raw.did),
    ord:         raw.ord,         // card template index (0, 1, 2 ...)
    mid:         String(raw.mid), // model id
    flds:        raw.flds,        // unit-separator delimited field values
    tags:        raw.tags || '',
    // scheduling
    state,
    due,
    last_review: null,
    reps:        raw.reps   || 0,
    lapses:      raw.lapses || 0,
    step:        0,
    interval:    Math.max(0, raw.ivl || 0),
    ease:        (raw.factor || 2500) / 1000,  // Anki stores ease * 1000
    stability:   null,
    difficulty:  null,
  };
}
