/** Ad-reward API. Called after a rewarded video completes to claim the credit. */
import api from './client';

/** Claim one bonus evaluation after watching a rewarded ad. */
export async function claimAdReward() {
  const { data } = await api.post('/ads/reward');
  return data; // { success, data: { remaining, message } }
}
