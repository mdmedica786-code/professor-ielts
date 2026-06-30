const { db } = require("./firebaseAdmin");

const PREMIUM_PLANS = ["pro", "ultra", "premium"];

/**
 * Returns true if the user currently has an active premium plan. Used to tier
 * the grader model (Pro keeps gpt-4o; free gets the cheaper model) and to hide
 * ads from paying users. Reads the same user doc shape usageService uses.
 */
async function getIsPremium(uid) {
  if (!db || !uid) return false;
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return false;
    const data = doc.data();
    if (!PREMIUM_PLANS.includes(data.plan)) return false;
    const premiumUntil = data.premiumUntil ? data.premiumUntil.toDate() : null;
    return !premiumUntil || premiumUntil > new Date();
  } catch (err) {
    console.error("getIsPremium error:", err.message);
    return false; // fail safe → treat as free
  }
}

module.exports = { getIsPremium, PREMIUM_PLANS };
