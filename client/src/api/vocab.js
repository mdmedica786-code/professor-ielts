/**
 * Vocabulary mini-app API client. Thin wrapper over the shared axios instance
 * (which already attaches the Firebase auth token). Cards are stored per-user in
 * Firestore; scheduling is computed client-side (utils/srs.js) and persisted via
 * updateCard().
 */
import api from './client';

/** List all of the signed-in user's cards. */
export async function getVocab() {
  const { data } = await api.get('/vocab');
  return data?.data || [];
}

/** Create one or many cards. Accepts an array of {front, back, example, tags, source}. */
export async function createCards(cards) {
  const payload = Array.isArray(cards) ? { cards } : { cards: [cards] };
  const { data } = await api.post('/vocab', payload);
  return data; // { success, data: createdCards, skipped }
}

/** Persist a card update (review result or manual edit). */
export async function updateCard(id, fields) {
  const { data } = await api.put(`/vocab/${id}`, fields);
  return data?.data;
}

/** Delete a card. */
export async function deleteCard(id) {
  const { data } = await api.delete(`/vocab/${id}`);
  return data;
}

/** Ask the backend to AI-generate a themed deck (returns unsaved suggestions). */
export async function generateDeck(topic, count = 10) {
  const { data } = await api.post('/vocab/generate', { topic, count });
  return data?.data || [];
}

/**
 * Extract vocabulary-correction flashcards from a completed evaluation result.
 * Speaking/Writing evaluations return `mistakes: [{ cat, said, fix, why }]`;
 * we turn the vocabulary ones into cards (front = what you said, back = the fix).
 */
export function vocabCardsFromEvaluation(evaluation) {
  const mistakes = Array.isArray(evaluation?.mistakes) ? evaluation.mistakes : [];
  return mistakes
    .filter((m) => String(m?.cat || '').toLowerCase() === 'vocabulary' && m?.said && m?.fix)
    .map((m) => ({
      front: String(m.said).trim(),
      back: String(m.fix).trim(),
      example: String(m.why || '').trim(),
      tags: ['from-evaluation'],
      source: 'correction',
    }));
}

/** Fire-and-forget: push an evaluation's vocabulary corrections into the deck. */
export async function addCardsFromEvaluation(evaluation) {
  const cards = vocabCardsFromEvaluation(evaluation);
  if (cards.length === 0) return { success: true, data: [] };
  return createCards(cards);
}
