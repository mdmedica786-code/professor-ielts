/**
 * Global content library API (the Makkar deck served by /api/library).
 * Thin wrapper over the shared axios instance — Firebase token is attached
 * by the interceptor in client.js. The card list is cached for the session
 * (content changes ~never at runtime; the server ETags it too).
 */
import api from './client';

let listCache = null;      // Promise<{deck, cards}>
const cardCache = new Map(); // cardNumber -> full card

/** Light list: { deck, cards: [{cardNumber, title, prompts}] } */
export function getDeckCards() {
  if (!listCache) {
    listCache = api
      .get('/library/deck/cards')
      .then(({ data }) => data)
      .catch((err) => {
        listCache = null; // let a later retry work
        throw err;
      });
  }
  return listCache;
}

/** Full card: { cardNumber, title, prompts, sampleAnswer, followUps } */
export async function getCard(cardNumber) {
  if (cardCache.has(cardNumber)) return cardCache.get(cardNumber);
  const { data } = await api.get(`/library/deck/cards/${cardNumber}`);
  cardCache.set(cardNumber, data);
  return data;
}

/**
 * Convert a Makkar card into the app-wide question shape
 * ({id, part, topic, text}) consumed by RecorderPanel / LiveTutor / evaluate.
 */
export function toPart2Question(card) {
  const prompts = (card.prompts || []).map((p) => `• ${p}`).join('\n');
  return {
    id: `makkar-${card.cardNumber}`,
    part: 2,
    topic: card.title,
    text: `${card.title}\nYou should say:\n${prompts}`,
    source: 'makkar',
  };
}

export function toPart3Question(card, followUp) {
  return {
    id: `makkar-${card.cardNumber}-fu${followUp.position}`,
    part: 3,
    topic: card.title,
    text: followUp.question,
    source: 'makkar',
  };
}
