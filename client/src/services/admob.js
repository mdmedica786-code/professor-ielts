/**
 * AdMob rewarded-ads service (Capacitor).
 *
 * Rewarded video is the monetisation that funds free usage without paywalling
 * features: the user watches an ad to earn one more evaluation. Ads only run in
 * the native app (the APK); on the web this is a graceful no-op so the build and
 * the browser experience are unaffected.
 *
 * ⚠️ Replace the TEST ad unit IDs below with your real AdMob IDs before release,
 * and add your AdMob App ID to AndroidManifest.xml — see ADMOB-SETUP.md.
 */
import { Capacitor } from '@capacitor/core';

// Google's official TEST rewarded ad units (safe to ship in dev; swap for real).
const REWARDED_AD_IDS = {
  android: 'ca-app-pub-3940256099942544/5224354917',
  ios: 'ca-app-pub-3940256099942544/1712485313',
};

// Flip to false once you've pasted real ad unit IDs and are ready for live ads.
const USE_TEST_ADS = true;

/** Rewarded ads are only available inside the native app. */
export function adsAvailable() {
  return Capacitor.isNativePlatform();
}

let initialized = false;

async function loadPlugin() {
  // Dynamic import so the web bundle never hard-depends on the native plugin.
  const mod = await import('@capacitor-community/admob');
  return mod;
}

async function ensureInit() {
  if (!adsAvailable()) return null;
  const mod = await loadPlugin();
  if (!initialized) {
    await mod.AdMob.initialize({ initializeForTesting: USE_TEST_ADS });
    initialized = true;
  }
  return mod;
}

/**
 * Show a rewarded video. Resolves true only if the user watched long enough to
 * earn the reward, false otherwise (skipped, failed, or not on a device).
 */
export async function showRewardedAd() {
  if (!adsAvailable()) return false;

  let mod;
  try {
    mod = await ensureInit();
  } catch (e) {
    console.warn('AdMob init failed:', e?.message || e);
    return false;
  }
  if (!mod) return false;

  const { AdMob, RewardAdPluginEvents } = mod;
  const adId = REWARDED_AD_IDS[Capacitor.getPlatform()] || REWARDED_AD_IDS.android;

  return new Promise((resolve) => {
    let earned = false;
    let settled = false;
    const listeners = [];
    const cleanup = async () => {
      for (const l of listeners) { try { await l.remove(); } catch { /* noop */ } }
    };
    const finish = async (value) => {
      if (settled) return;
      settled = true;
      await cleanup();
      resolve(value);
    };

    (async () => {
      try {
        listeners.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { earned = true; }));
        listeners.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish(earned)));
        listeners.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish(false)));
        listeners.push(await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => finish(false)));

        await AdMob.prepareRewardVideoAd({ adId, isTesting: USE_TEST_ADS });
        await AdMob.showRewardVideoAd();
      } catch (e) {
        console.warn('Rewarded ad error:', e?.message || e);
        finish(false);
      }
    })();

    // Safety timeout so the UI never hangs if no callback fires.
    setTimeout(() => finish(earned), 90_000);
  });
}
