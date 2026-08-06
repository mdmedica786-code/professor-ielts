import localforage from 'localforage';

// ─── Stores ────────────────────────────────────────────────────────────────
const decksStore = localforage.createInstance({ name: 'BandLogicDecks', storeName: 'decks' });
const mediaStore = localforage.createInstance({ name: 'BandLogicDecks', storeName: 'media' });
const progressStore = localforage.createInstance({ name: 'BandLogicDecks', storeName: 'progress' });

// ─── Media ─────────────────────────────────────────────────────────────────
export async function saveMedia(filename, blob) {
  await mediaStore.setItem(filename, blob);
}

export async function getMediaUrl(filename) {
  const blob = await mediaStore.getItem(filename);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function saveMediaBatch(mediaFilesMap) {
  await Promise.all(
    Object.entries(mediaFilesMap).map(([fn, blob]) => saveMedia(fn, blob))
  );
}

// ─── Deck CRUD ─────────────────────────────────────────────────────────────

/**
 * Save a deck. deckData shape:
 *   { id, title, models, deckConf, cards[] }
 *   deckConf: { newPerDay, revPerDay, learningSteps, relearningSteps }
 */
export async function saveDeck(deckId, deckData) {
  await decksStore.setItem(deckId, deckData);
  await _upsertManifest(deckId, deckData);
}

async function _upsertManifest(deckId, deckData) {
  const manifest = await getManifest();
  const idx = manifest.findIndex(m => m.id === deckId);
  const entry = {
    id:        deckId,
    title:     deckData.title,
    count:     deckData.cards.length,
    timestamp: Date.now(),
  };
  if (idx >= 0) manifest[idx] = entry;
  else manifest.push(entry);
  await decksStore.setItem('_manifest', manifest);
}

export async function getDeck(deckId) {
  return await decksStore.getItem(deckId);
}

export async function getManifest() {
  return (await decksStore.getItem('_manifest')) || [];
}

export async function deleteDeck(deckId) {
  await decksStore.removeItem(deckId);
  const manifest = (await getManifest()).filter(m => m.id !== deckId);
  await decksStore.setItem('_manifest', manifest);
}

// ─── Card progress ─────────────────────────────────────────────────────────

/**
 * Persist scheduling state for a single card.
 * We store ALL card progress in a flat progressStore keyed by deckId:cardId
 * so deck reads stay fast (no need to rewrite the 4000-card blob on every grade).
 */
export async function updateCardProgress(deckId, cardId, progressData) {
  const key = `${deckId}:${cardId}`;
  const existing = (await progressStore.getItem(key)) || {};
  await progressStore.setItem(key, { ...existing, ...progressData });
}

/** Hydrate a deck's cards with their saved progress (fast join in JS). */
export async function getDeckWithProgress(deckId) {
  const deck = await getDeck(deckId);
  if (!deck) return null;

  const prefix = `${deckId}:`;
  const progressMap = {};
  await progressStore.iterate((val, key) => {
    if (key.startsWith(prefix)) {
      progressMap[key.slice(prefix.length)] = val;
    }
  });

  const cards = deck.cards.map(c => {
    const prog = progressMap[c.id];
    return prog ? { ...c, ...prog } : c;
  });

  return { ...deck, cards };
}

// ─── Daily counters ────────────────────────────────────────────────────────
// Tracks how many new / review cards were shown for a given deck today.
// Key: daily:deckId:dateKey  e.g. "daily:cambridge:2025-08-06"
// Value: { newShown: number, revShown: number }

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function getDailyCounters(deckId) {
  const key = `daily:${deckId}:${todayKey()}`;
  return (await progressStore.getItem(key)) || { newShown: 0, revShown: 0 };
}

export async function incrementDailyCounters(deckId, { newCount = 0, revCount = 0 }) {
  const key = `daily:${deckId}:${todayKey()}`;
  const existing = (await progressStore.getItem(key)) || { newShown: 0, revShown: 0 };
  await progressStore.setItem(key, {
    newShown: existing.newShown + newCount,
    revShown: existing.revShown + revCount,
  });
}
