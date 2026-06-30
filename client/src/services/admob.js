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

// ─── Banner ─────────────────────────────────────────────────────────
// Google TEST banner/interstitial units — replace with your real ones.
const BANNER_AD_IDS = {
  android: 'ca-app-pub-3940256099942544/6300978111',
  ios: 'ca-app-pub-3940256099942544/2934735716',
};
const INTERSTITIAL_AD_IDS = {
  android: 'ca-app-pub-3940256099942544/1033173712',
  ios: 'ca-app-pub-3940256099942544/4411468910',
};

let bannerShown = false;

/** Show a bottom anchor banner (no-op on web / if already shown). */
export async function showBanner() {
  if (!adsAvailable() || bannerShown) return;
  let mod;
  try { mod = await ensureInit(); } catch { return; }
  if (!mod) return;
  const { AdMob, BannerAdSize, BannerAdPosition } = mod;
  try {
    await AdMob.showBanner({
      adId: BANNER_AD_IDS[Capacitor.getPlatform()] || BANNER_AD_IDS.android,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: USE_TEST_ADS,
    });
    bannerShown = true;
  } catch (e) {
    console.warn('Banner error:', e?.message || e);
  }
}

/** Remove the banner if one is showing. */
export async function hideBanner() {
  if (!adsAvailable() || !bannerShown) return;
  try {
    const mod = await loadPlugin();
    await mod.AdMob.removeBanner();
  } catch { /* noop */ }
  bannerShown = false;
}

/** Show a full-screen interstitial (e.g. occasionally between actions). */
export async function showInterstitial() {
  if (!adsAvailable()) return false;
  let mod;
  try { mod = await ensureInit(); } catch { return false; }
  if (!mod) return false;
  const { AdMob } = mod;
  const adId = INTERSTITIAL_AD_IDS[Capacitor.getPlatform()] || INTERSTITIAL_AD_IDS.android;
  try {
    await AdMob.prepareInterstitial({ adId, isTesting: USE_TEST_ADS });
    await AdMob.showInterstitial();
    return true;
  } catch (e) {
    console.warn('Interstitial error:', e?.message || e);
    return false;
  }
}
