const express = require("express");
const { db } = require("../services/firebaseAdmin");

const router = express.Router();

// How many ad-rewards a user can claim per day. Caps abuse since this MVP grants
// the reward on the client's word that an ad was watched (see ADMOB-SETUP.md →
// "Server-Side Verification" for the fraud-proof upgrade path).
const MAX_REWARDS_PER_DAY = parseInt(process.env.AD_REWARDS_PER_DAY, 10) || 5;

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/**
 * POST /api/ads/reward
 * Called after the user finishes a rewarded video. Grants ONE more evaluation by
 * giving back a usage credit, capped at MAX_REWARDS_PER_DAY per user per day.
 *
 * Deliberately does NOT touch usageService — it just decrements the relevant
 * usage counter so the user's next evaluation passes checkUsage normally.
 */
router.post("/reward", async (req, res, next) => {
  if (!db) {
    return res.status(503).json({ success: false, error: "Storage is not configured on the server." });
  }
  try {
    const userRef = db.collection("users").doc(req.uid);

    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      const data = doc.exists ? doc.data() : {};
      const today = todayKey();

      const grantedToday = data.bonusDate === today ? (data.bonusGrantedToday || 0) : 0;
      if (grantedToday >= MAX_REWARDS_PER_DAY) {
        return {
          allowed: false,
          remaining: 0,
          message: `You've claimed your ${MAX_REWARDS_PER_DAY} ad rewards for today. Come back tomorrow or upgrade to Pro for unlimited practice.`,
        };
      }

      const update = {
        bonusDate: today,
        bonusGrantedToday: grantedToday + 1,
        bonusEarnedTotal: (data.bonusEarnedTotal || 0) + 1,
      };

      // Return one credit on whichever counter is currently limiting the user.
      const premiumUntil = data.premiumUntil ? data.premiumUntil.toDate() : null;
      const activePremium =
        ["pro", "ultra", "premium"].includes(data.plan) && (!premiumUntil || premiumUntil > new Date());

      if (activePremium && (data.premiumDailyUsed || 0) > 0) {
        update.premiumDailyUsed = Math.max(0, (data.premiumDailyUsed || 0) - 1);
      } else {
        update.freeUsed = Math.max(0, (data.freeUsed || 0) - 1);
      }

      if (doc.exists) {
        t.update(userRef, update);
      } else {
        t.set(userRef, { plan: "free", createdAt: new Date(), ...update });
      }

      return { allowed: true, remaining: MAX_REWARDS_PER_DAY - (grantedToday + 1) };
    });

    if (!result.allowed) {
      return res.status(429).json({ success: false, error: result.message, remaining: 0 });
    }

    res.json({
      success: true,
      data: { remaining: result.remaining, message: "You earned 1 free evaluation!" },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
