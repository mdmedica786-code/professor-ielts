/** User entitlement API — plan + ad-removal status. */
import api from './client';

export async function getMe() {
  const { data } = await api.get('/user/me');
  return data; // { success, plan, premiumUntil, adsRemoved }
}
