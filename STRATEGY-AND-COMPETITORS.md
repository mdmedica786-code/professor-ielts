# Professor IELTS — Market, Competitors & Go-to-Market Plan

*Prepared June 2026. Revenue figures are third-party estimates (getLatka/Tracxn-style
trackers), not audited accounts — treat as directional. Nothing here is legal,
tax, or financial advice; verify registration/tax locally.*

---

## 1. The market — is this worth building?

Yes. The demand is large, growing, and English-test-heavy in exactly the regions
you can reach.

- **IELTS was taken 4.1M+ times in 2024** (India alone ~1.1M — the single biggest
  source country; China several hundred thousand).
- **IELTS test-prep market ≈ $2.5B in 2025 → ~$6.5B by 2033 (~10%/yr).**
- Broader **English-proficiency testing ≈ $3.65B (2024) → ~$7.46B (2032)**.
- Speaking is the skill learners fear most and the hardest to self-assess — which
  is exactly your core. That's a real wedge.

**Implication:** you don't need to beat ELSA or Speak. Capturing a sliver of the
India/Pakistan/Bangladesh/Nigeria IELTS-prep segment at a low price point is a
viable solo business.

---

## 2. Competitors

| App | Scale / earnings | Price | What they do well | Flaws / gaps you can exploit |
|-----|------------------|-------|-------------------|------------------------------|
| **ELSA Speak** | ~$32.5M rev (2023), est. ~$49.6M (2026); 13M+ users; $60M raised | Pro plans (tiered, ~$ a few /mo on annual) | Best-in-class **phoneme-level pronunciation** scoring; polished; has IELTS modules | Pronunciation-first, **not a real IELTS examiner** (no FC/LR/GRA band logic, no Writing/Reading); generic drills |
| **Speak (speak.com)** | **$100M revenue, $1B valuation**, OpenAI-backed, 10M+ learners | ~$80–200/yr | Conversational AI tutor; huge funding; brand | **Not IELTS-specific**; no band score; expensive; conversation ≠ exam prep |
| **SmallTalk2Me** | Freemium, smaller indie | ~**$10–12/mo**, ~$252/yr | Instant **AI IELTS band (1–9)** on fluency/vocab/grammar/pronunciation; closest direct competitor | Estimate-only band; thin on Writing/Reading; pricing high for South Asia |
| **TalkFace AI** | App-store IELTS app | Freemium/sub | 2025 question bank, **band report**, mock tests | Narrow (speaking); limited diagnostic depth |
| **EngVarta / FixoLang** | Human + AI tutors | Pay per session | Live human practice | Expensive, not instant, not scalable; scheduling friction |
| **IELTSpeakingPro AI** | Niche | Sub | IELTS-only examiner-style | Small; speaking-only |

**The pattern:** the giants (ELSA, Speak) are *general English*, not IELTS exam
engines. The IELTS-specific AI apps (SmallTalk2Me, TalkFace) are speaking-only
band estimators priced for Western wallets. **Nobody owns "affordable, full
IELTS examiner across Speaking + Writing + Reading for South Asia."** That's your
gap to take.

---

## 3. Where Professor IELTS already wins

- **Real examiner logic, not just a score.** Your grader scores FC/LR/GRA against
  per-band anchors with explicit anti-central-tendency calibration, quotes exact
  evidence, lists mistakes with corrections, and gives an action plan. That's
  closer to a real examiner than SmallTalk2Me's single number.
- **Fluency diagnostics competitors don't show** — verbatim transcript with
  filler/pause/repetition/false-start analysis and a disfluency rate.
- **Multi-skill** — you already have **Speaking, Writing, and Reading** sections.
  Most AI rivals are speaking-only.
- **Per-student roster on-device** — useful for tutors/families (a niche ELSA/Speak ignore).
- **Lean cost base** — one OpenAI call path; you can undercut $10/mo easily.

## 4. Where Professor IELTS is lacking (priority order)

1. **Pronunciation is your weakest point vs ELSA.** Yours is disabled / an
   intelligibility proxy; ELSA's phoneme-level scoring is its whole brand. Either
   integrate a real pronunciation API (Azure Pronunciation Assessment / Speechace)
   or be explicit it's an "intelligibility estimate." **Biggest credibility gap.**
2. **No Listening section.** IELTS has 4 skills; you have 3. Listening is very
   automatable (audio + question bank + auto-marking) and would make you "complete."
3. **No accounts / cloud sync / no way to monetize yet** — the thing this plan fixes.
4. **No conversational practice** (Speak's strength) — a back-and-forth Part-1/3
   simulator would be a strong differentiator later.
5. **No official-score disclaimer / trust markers** — must say clearly "estimated,
   not an official IELTS score" (also protects you legally).
6. **Polish gaps** from the earlier audit (error boundary, tests, async long calls).

---

## 5. Authentication — recommendation

**Use Firebase Authentication. Offer Google Sign-In + Phone (OTP).** Reasoning:

- **Google Sign-In** is one tap on Android and what users expect.
- **Phone OTP** fits your region (everyone has a number; many lack credit cards) —
  and Firebase gives a generous free SMS allowance.
- Firebase Auth is **free** at your scale, handles all the security, and drops
  into a Capacitor app cleanly. The backend verifies a Firebase ID token on each
  request — small change to your Express middleware.
- **WhatsApp/Telegram login: not recommended.** There's no real WhatsApp OAuth;
  Telegram's login widget is clunky and unfamiliar for an exam app. You'd build
  more and trust less. (You can still *notify* via WhatsApp later if you want.)

**Net:** Firebase = least work, most trust, best regional fit.

---

## 6. Payments & the free/paid model

### The Play Store reality (important)
- Historically Google **required Google Play Billing** for in-app digital goods,
  taking **15–30%**. After the 2025 Epic ruling, **third-party billing is opening
  up — but mainly in the US (and EU/UK via external links)**. In most of the world
  (incl. South Asia) **Play Billing is still effectively required inside a Play
  Store app** for selling subscriptions/tests.
- So you have two clean routes:
  - **(A) Sell on the web** (your hosted site / a "Manage subscription" page) using
    a **Merchant of Record** like **Lemon Squeezy or Paddle** (they handle global
    cards + tax; 130+ countries; payouts to 110+ incl. bank/PayPal). The app then
    just unlocks for logged-in paid users. Lower fees, works regardless of region,
    but you must not *prompt purchase inside the Play app* in a way that breaks
    policy — you link out / sell on web.
  - **(B) Use Google Play Billing** inside the app. Simplest UX, but 15–30% cut and
    payout-country support matters (verify Pakistan payout support before relying on it).
- **Recommended:** start with **(A) web checkout via Lemon Squeezy/Paddle** while
  you also distribute the APK directly (no store cut at all during early growth),
  then add Play Billing if/when you go big on the Play Store. This keeps fees low
  and sidesteps the regional payout question.

### Free vs Premium (your "1 test / 2 days" idea is sound — here's a concrete shape)
- **Free**
  - 3 full evaluations on first sign-up (let them feel the magic), **then 1
    evaluation every 48 hours**.
  - Speaking + Writing + Reading all usable, but rate-limited as above.
  - History kept; PDF export limited or watermarked.
- **Premium (~the price that works for your region — see below)**
  - **Unlimited** evaluations across all sections.
  - Pronunciation add-on (once integrated), full history sync, clean PDF
    certificate, priority (no cold-start) backend later.
- **Pricing:** rivals sit at $10–12/mo. For South Asia, price for volume:
  ~**$3–5/mo** (or local-currency equivalent, e.g. PKR/INR), with a cheaper
  **annual** plan and maybe a **7-day "exam sprint"** pass for one-off test-takers.
  Merchant-of-record tools support local pricing.

### What this requires technically (build order)
Monetization can't be enforced on-device alone (users could clear storage). It needs:
1. **Accounts** (Firebase Auth) → every request carries a verified user.
2. **A database** (the audit's recommendation) storing each user's plan + usage count.
3. **Server-side metering** — the backend checks "has this user used their free
   slot in the last 48h?" before calling OpenAI; returns a friendly "upgrade" message if so.
4. **Checkout + webhook** — Lemon Squeezy/Paddle marks the user "premium" via a
   webhook to your backend.

---

## 7. Getting onto the Play Store — readiness checklist

- **Developer account:** $25 one-time. **New *personal* accounts (created after
  Nov 13 2023) must run a closed test with ≥12 testers for 14 continuous days**
  before you can publish to production. Plan for this 2-week window. (A *business*
  account is exempt but needs a registered org / D-U-N-S.)
- **Build a signed release AAB** (not the debug APK) with a **stable upload key**
  (we'll generate and store one — also fixes the "can't update without uninstall"
  problem).
- **Required policy items:** a hosted **Privacy Policy** (you collect mic audio +
  account + payments — mandatory), the **Data Safety** form, content rating
  questionnaire, and an **account-deletion** path (Google requires users can delete
  their account/data).
- **Store listing:** icon, feature graphic, screenshots, description.
- **Webview-wrapper scrutiny:** Google sometimes rejects "just a website" apps —
  your native mic recording + real features clear that bar, but the listing should
  emphasize the native value.
- **Target API level** must meet Google's current minimum (the CI build can target it).

---

## 8. Recommended sequence (so we don't boil the ocean)

1. **Auto-deploy / hosted UI** (in progress) — create the Render Static Site, point
   the app at it. *(You: make the static site, send me the URL.)*
2. **Accounts** — Firebase Auth (Google + phone), backend verifies the token.
3. **Database + usage metering** — store plan + usage; enforce the free limit
   server-side. (Also clears several audit items.)
4. **Paywall + checkout** — Lemon Squeezy/Paddle web checkout + webhook → premium flag.
5. **Pronunciation upgrade** — wire Azure/Speechace so the weakest area becomes a strength.
6. **Listening section** — make the app a complete 4-skill IELTS suite.
7. **Play Store prep** — release signing, privacy policy, data-safety, 12-tester
   closed test, listing → production.

Each is a self-contained step we can do one at a time, like we did the deploy.

---

## Sources
- ELSA revenue/users: [getLatka](https://getlatka.com/companies/elsaspeak.com), [Tracxn](https://tracxn.com/d/companies/elsa-speak/__oUqt06y8Fr5r2uVOAaIrTCxiqTQTMJGQoEAHCu57JWE), [RocketReach](https://rocketreach.co/elsa-corp-profile_b5a2bc54f68987d6)
- Speak revenue/valuation: [getLatka](https://getlatka.com/companies/speak.com), [TechCrunch](https://techcrunch.com/2024/12/10/openai-backed-speak-raises-78m-at-1b-valuation-to-help-users-learn-languages-by-talking-out-loud), [Yahoo Finance](https://finance.yahoo.com/news/1-billion-ai-startup-backed-144613265.html)
- IELTS-specific apps: [SmallTalk2Me](https://smalltalk2.me/ielts), [TalkFace (App Store)](https://apps.apple.com/us/app/ielts-prep-app-talkface-ai/id6446065891), [3D Academy roundup](https://3d-universal.com/en/blogs/best-ai-tools-for-ielts-speaking-practice-in-2025.html)
- SmallTalk2Me pricing: [pricing page](https://app.smalltalk2.me/pricing), [aichief review](https://aichief.com/ai-education-tools/smalltalk2me/)
- IELTS volume & market: [British Council — 3.5M/yr](https://takeielts.britishcouncil.org/about/press/ielts-grows-three-half-million-year), [Credence Research — English proficiency market](https://www.credenceresearch.com/report/english-proficiency-test-market), [Market Report Analytics — IELTS prep market](https://www.marketreportanalytics.com/reports/ielts-test-preparation-73225)
- Play billing policy: [Play Console Help — Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en), [US update](https://support.google.com/googleplay/android-developer/answer/15582165?hl=en), [AndroidHeadlines](https://www.androidheadlines.com/2025/10/google-play-store-alternative-third-party-billing-us-ruling-epic-games.html)
- Play testing requirement: [Play Console Help — testing for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- Merchant of Record options: [Lemon Squeezy supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries), [Paddle vs Lemon Squeezy](https://www.paddle.com/compare/lemon-squeezy)
