/** Lemon Squeezy checkout. Returns a hosted checkout URL to redirect to. */
import api from './client';

/**
 * @param {'monthly'|'annual'|'sprint'|'removeads'} plan — must map to a
 *   LEMONSQUEEZY_VARIANT_* env var on the server.
 */
export async function createCheckout(plan) {
  const { data } = await api.post('/payments/checkout', { plan });
  return data; // { success, data: { url } }
}
