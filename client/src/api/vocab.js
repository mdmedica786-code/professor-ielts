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
