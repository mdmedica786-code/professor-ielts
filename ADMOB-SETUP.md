# AdMob Rewarded Ads — Setup & Go-Live

Watch-an-ad-to-earn-an-evaluation is now wired end to end. It funds free usage
**without paywalling any features** — the user just watches a rewarded video to
get one more evaluation, capped per day.

It ships with **Google TEST ads** so it works immediately. Do the 3 swaps below
before you publish, or you'll show test ads (and real ad clicks on test units
violate AdMob policy).

---

## What was added

**Client**
- `client/src/services/admob.js` — initialises AdMob and shows a rewarded video. No-op on the web (ads only run in the APK), so the website build is unaffected.
- `client/src/api/ads.js` — `claimAdReward()` → `POST /api/ads/reward`.
- `client/src/components/common/PaywallModal.jsx` — adds a green **“Watch an ad for 1 free evaluation”** button (shown only inside the app).
- `client/package.json` — adds `@capacitor-community/admob`.

**Server**
- `server/routes/ads.js` — `POST /api/ads/reward`: grants one evaluation, capped at `AD_REWARDS_PER_DAY` (default **5**) per user per day. It does **not** touch `usageService.js`; it just returns one usage credit, so your billing logic is untouched.
- `server/index.js` — mounts `/api/ads` behind `verifyAuth`.

**CI**
- `.github/workflows/android.yml` — injects the AdMob **App ID** into `AndroidManifest.xml` (required, or the app crashes on launch).

---

## How the flow works

1. User hits their free limit → server returns `402` → `PaywallModal` opens.
2. Inside the app, they tap **Watch an ad for 1 free evaluation**.
3. `showRewardedAd()` plays the video; on completion the client calls `POST /api/ads/reward`.
4. The server returns one credit (daily-capped); the user re-runs their evaluation and it passes.

---

## 3 swaps to go live

1. **Rewarded ad unit IDs** — `client/src/services/admob.js`, `REWARDED_AD_IDS`. Replace the test units with your real AdMob rewarded unit IDs (AdMob → Ad units).
2. **Flip off test mode** — same file, set `const USE_TEST_ADS = false;`.
3. **App ID** — `.github/workflows/android.yml`, `ADMOB_APP_ID`. Replace `ca-app-pub-3940256099942544~3347511713` with your real AdMob **App ID** (AdMob → App settings). For the **iOS** build add it to `Info.plist` as `GADApplicationIdentifier`.

Then, in `client/`, run `npm install` once (to pull the new plugin) before the next web build and APK build. CI already runs `npm install`, so the next pushed APK picks it up automatically.

---

## Tuning

- **Daily reward cap:** set env var `AD_REWARDS_PER_DAY` on Render (default 5).
- **Where ads appear:** rewarded only, on the paywall. Banners/interstitials on zero-cost screens (history, vocab browsing, results) are a safe follow-up — they don't trigger a paid API call, so that revenue is pure margin.

---

## Before you ship (important)

- **Server-Side Verification (SSV) — the fraud fix.** Right now the client tells the server "I watched an ad" and the server trusts it (capped at 5/day to limit abuse). For real money, enable AdMob **SSV**: AdMob calls a server URL with a signed reward; verify the signature with Google's public keys before granting. Until then, keep the daily cap low.
- **Families / age policy.** IELTS students can be under 18. In AdMob, set the app's content rating and tag ad requests appropriately, or Google can suspend the account. Don't show ads to users you know are children without the right configuration.
- **Keep usage caps on.** The `checkUsage` limits must stay enabled so ad-funded free users can't run an unbounded OpenAI/Azure bill.
- **Economics reality:** in low-CPM regions a single rewarded view may not fully cover a `gpt-4o` evaluation's API cost. The separate lever is switching the *free* tier's grader to `gpt-4o-mini` (~10–20× cheaper) — say the word and I'll do it.
