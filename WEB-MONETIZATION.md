# Web Monetization — Status & Plan

Strategy for the website/PWA (Hostinger), tuned to your market (Uzbekistan +
Pakistan): low ad CPMs, low international-card penetration, and Stripe is **not
available** to merchants in either country. So the order is: affiliate (now) →
local payment automation (biggest local lever) → Lemon Squeezy for international
→ SEO content → AdSense.

---

## ✅ Built now

### 1. Affiliate recommendations
- `client/src/data/affiliateLinks.js` — edit the URLs/tags (placeholders marked `TODO`).
- `client/src/components/common/RecommendStrip.jsx` — reusable `<RecommendStrip />`, shows a disclosure, `rel="sponsored"`.
- Placed on the **History** screen. Drop `<RecommendStrip />` onto the results screen or vocab home too for more surface.
- **To activate:** sign up for Amazon Associates and/or Daraz Affiliate (ships in PK), a course program (Udemy via Rakuten/Impact), and paste your tagged links. Set `AFFILIATE_ENABLED`.
- Note: official test providers (British Council/IDP) don't run affiliate programs — don't link test bookings expecting commission.

### 2. Lemon Squeezy automated checkout (international cards)
- Client: `client/src/api/payments.js` + a "Pay online by card" button on `UpgradeScreen` → redirects to LS hosted checkout.
- Server: `payments.js` webhook already verifies the HMAC signature; it now branches on `custom_data.type` → `"removeads"` flips `adsRemoved`, otherwise grants Pro. Added a `removeads` variant.
- **To activate (env on Render):** `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`, and `LEMONSQUEEZY_VARIANT_MONTHLY` / `_ANNUAL` / `_SPRINT` / `_REMOVEADS`. Point the LS webhook at `https://api.bandlogic.online/api/payments/webhook`.
- **Before you rely on it:** confirm Lemon Squeezy can pay **out** to your bank in PK/UZ (PayPal isn't usable in Pakistan). If not, LS is checkout-only via a Wise/Payoneer account, or use a foreign entity.

---

## 🔜 Needs your input to build (I won't half-wire money code blind)

### 3. Local payment gateways — the biggest local-conversion lever
Your "pay then send a Telegram screenshot" flow loses a lot of buyers. Automating
a local gateway converts far better. Recommended per country:

| Country | Gateway | Notes |
|---|---|---|
| Uzbekistan | **Payme** or **Click** | Accept Uzcard/Humo; the methods locals actually use. Click uses a Prepare/Complete callback; Payme uses a JSON-RPC merchant API. |
| Pakistan | **Safepay** (cards) or **JazzCash/Easypaisa** (wallets) | Safepay has clean docs; JazzCash/Easypaisa use hashed request/verify APIs. |

**Implementation shape (same for all):**
1. `POST /api/payments/local/checkout` → create an order, return the gateway's payment URL/params.
2. Gateway redirects the user to pay; on success it calls your **server callback** (`/api/payments/local/callback`).
3. Verify the callback signature/hash **server-side**, mark the order paid, then grant Pro / set `adsRemoved` (reuse the same Firestore update the LS webhook uses).
4. Idempotency + signature verification are mandatory (this is real money).

**What I need from you to build one:** pick a gateway, create the merchant account, and share the **sandbox** Merchant ID + API keys + their callback spec. Give me that and I'll build + test the integration end to end. Start with **one** (I'd pick Click or Payme, since your pricing is already in UZS).

### 4. SEO content layer (the thing that makes AdSense viable)
A login-gated SPA won't get AdSense-approved and has no organic traffic. The fix
is public, indexable pages.

**Structure (static, served by Hostinger):**
- `bandlogic.online/blog/` — articles: "IELTS Speaking Part 2 cue cards", "Band 7 collocations", "How FSRS helps you memorise vocabulary", etc.
- `sitemap.xml`, `robots.txt`, per-page `<title>`/meta description/Open Graph, and Article JSON-LD.
- A privacy policy + terms page (AdSense requires it).
- Internal links from articles → the app (drives signups too).

**What I can do:** scaffold the static page template, `sitemap.xml`/`robots.txt`, meta/JSON-LD, and one example article wired for SEO. **What needs you:** the actual articles (or approve me drafting a starter set), and an AdSense account once there's traffic.

**Sequencing reality:** AdSense pays ~$0.1–1 per 1,000 views in your region, so this only matters after the content is pulling real organic traffic. Treat it as a 2–3 month play, not a quick switch.

---

## Recommended next step
Turn on **affiliate** today (just paste links). Then pick **one local gateway** and get me sandbox creds — that's the highest-ROI build for your actual users. SEO content can run in parallel as a slower compounding play.
