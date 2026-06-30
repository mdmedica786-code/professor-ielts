import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../api/user';
import { adsAvailable } from '../services/admob';

const PREMIUM = ['pro', 'ultra', 'premium'];

/**
 * Resolves the signed-in user's entitlements and whether ads should show.
 * Ads show only in the native app, for users who are NOT paying and have NOT
 * bought the ad-removal upgrade.
 */
export default function useEntitlements() {
  const { user } = useAuth();
  const [ent, setEnt] = useState({ plan: 'free', isPremium: false, adsRemoved: false, loaded: false });

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setEnt({ plan: 'free', isPremium: false, adsRemoved: false, loaded: true });
      return;
    }
    getMe()
      .then((d) => {
        if (cancelled) return;
        setEnt({
          plan: d?.plan || 'free',
          isPremium: PREMIUM.includes(d?.plan),
          adsRemoved: !!d?.adsRemoved,
          loaded: true,
        });
      })
      .catch(() => { if (!cancelled) setEnt((e) => ({ ...e, loaded: true })); });
    return () => { cancelled = true; };
  }, [user]);

  const showAds = adsAvailable() && ent.loaded && !ent.isPremium && !ent.adsRemoved;
  return { ...ent, showAds };
}
