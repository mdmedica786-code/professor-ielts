const express = require("express");
const crypto = require("crypto");
const fetch = require("node-fetch");
const { db } = require("../services/firebaseAdmin");
const { verifyAuth } = require("../middleware/verifyAuth");

const router = express.Router();

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;

const VARIANTS = {
  monthly: process.env.LEMONSQUEEZY_VARIANT_MONTHLY,
  annual: process.env.LEMONSQUEEZY_VARIANT_ANNUAL,
  sprint: process.env.LEMONSQUEEZY_VARIANT_SPRINT,
  removeads: process.env.LEMONSQUEEZY_VARIANT_REMOVEADS,
};

/**
 * POST /api/payments/checkout
 * Generates a checkout URL for the requested plan
 */
router.post("/checkout", express.json(), verifyAuth, async (req, res, next) => {
  try {
    const { plan } = req.body;
    const variantId = VARIANTS[plan];

    if (!variantId) {
      return res.status(400).json({ success: false, error: "Invalid plan selected." });
    }
    
    if (!LEMONSQUEEZY_API_KEY) {
      // For local dev without API key
      return res.json({ 
        success: true, 
        data: { url: "https://lemonsqueezy.com/checkout?test=true" }
      });
    }

    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "Authorization": `Bearer ${LEMONSQUEEZY_API_KEY}`
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              custom: {
                uid: req.uid,
                type: plan === "removeads" ? "removeads" : "plan"
              }
            }
          },
          relationships: {
            store: { data: { type: "stores", id: STORE_ID } },
            variant: { data: { type: "variants", id: variantId } }
          }
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("LemonSqueezy checkout error:", err);
      return res.status(500).json({ success: false, error: "Failed to generate checkout." });
    }

    const data = await response.json();
    res.json({ success: true, data: { url: data.data.attributes.url } });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/webhook
 * Handles Lemon Squeezy webhooks (subscription created, updated, etc)
 */
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-signature"];
    const payload = req.body; // Raw buffer

    if (!LEMONSQUEEZY_WEBHOOK_SECRET) {
      console.warn("Webhook received but LEMONSQUEEZY_WEBHOOK_SECRET is not set.");
      return res.status(200).send("OK");
    }

    const hmac = crypto.createHmac("sha256", LEMONSQUEEZY_WEBHOOK_SECRET);
    const digest = Buffer.from(hmac.update(payload).digest("hex"), "utf8");
    const signatureBuffer = Buffer.from(signature || "", "utf8");

    if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(payload.toString("utf8"));
    const eventName = event.meta.event_name;
    const customData = event.meta.custom_data || {};
    const uid = customData.uid;

    if (!uid || !db) {
      return res.status(200).send("OK");
    }

    const userRef = db.collection("users").doc(uid);

    // "Remove Ads" one-time purchase — flip the ad flag, don't grant Pro.
    if (customData.type === "removeads") {
      if (eventName === "order_created" || eventName === "subscription_created") {
        await userRef.set({ adsRemoved: true }, { merge: true });
      }
      return res.status(200).send("OK");
    }

    if (eventName === "subscription_created" || eventName === "subscription_updated" || eventName === "order_created") {
      const attributes = event.data.attributes;
      const status = attributes.status; // e.g. 'active', 'past_due', 'unpaid', 'cancelled', 'expired'

      // Compute expiry
      let premiumUntil = null;
      if (attributes.renews_at) {
        premiumUntil = new Date(attributes.renews_at);
      } else if (attributes.ends_at) {
        premiumUntil = new Date(attributes.ends_at);
      } else if (eventName === "order_created") {
        // One-time sprint pass (7 days)
        premiumUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else {
        // Fallback for active subscription
        premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      // Determine tier from variant. usageService.js checks for "pro"
      // or "ultra" — never store "premium" (legacy mismatch).
      // Default to "pro"; add ultra variant detection when an ultra plan exists.
      const tier = "pro";

      if (status === "active" || eventName === "order_created") {
        await userRef.update({
          plan: tier,
          premiumUntil: premiumUntil
        });
      } else if (status === "expired" || status === "cancelled" || status === "unpaid") {
        await userRef.update({
          plan: "free"
        });
      }
    }

    res.status(200).send("OK");

  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).send("Webhook Error");
  }
});

module.exports = router;
