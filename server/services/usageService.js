const { db } = require('./firebaseAdmin');

async function checkAndIncrementUsage(uid, isAnonymous = false) {
  if (!db) {
    console.warn("Firestore not configured, bypassing usage check.");
    return { allowed: true };
  }

  const userRef = db.collection('users').doc(uid);
  
  try {
    // We use a transaction to ensure no race conditions if the user submits multiple requests simultaneously.
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(userRef);
      const now = new Date();
      
      if (!doc.exists) {
        // First time user
        transaction.set(userRef, {
          plan: 'free',
          freeUsed: 1,
          lastFreeAt: now,
          createdAt: now
        });
        return { allowed: true };
      }
      
      const data = doc.data();
      
      if (data.plan === 'premium') {
        const premiumUntil = data.premiumUntil ? data.premiumUntil.toDate() : null;
        if (!premiumUntil || premiumUntil > now) {
          // Add usage analytics counter if needed
          transaction.update(userRef, {
            totalPremiumUsed: (data.totalPremiumUsed || 0) + 1,
            lastPremiumAt: now
          });
          return { allowed: true };
        }
      }
      
      const freeUsed = data.freeUsed || 0;
      const lastFreeAt = data.lastFreeAt ? data.lastFreeAt.toDate() : new Date(0);
      
      const maxFree = isAnonymous ? 1 : 3;

      if (freeUsed < maxFree) {
        // Still in free evals window
        transaction.update(userRef, {
          freeUsed: freeUsed + 1,
          lastFreeAt: now
        });
        return { allowed: true };
      }
      
      // If anonymous and out of quota, they must register (no cooldown reset)
      if (isAnonymous) {
        return {
          allowed: false,
          retryAfterMs: 0,
          message: `You've used your 1 free guest evaluation. Please sign in or register to get more free attempts.`
        };
      }

      // Check 48h cooldown for registered users
      const msSinceLast = now.getTime() - lastFreeAt.getTime();
      const cooldownMs = 48 * 60 * 60 * 1000;
      
      if (msSinceLast >= cooldownMs) {
        // Cooldown passed, grant 1 eval and reset timer
        transaction.update(userRef, {
          freeUsed: freeUsed + 1,
          lastFreeAt: now
        });
        return { allowed: true };
      }
      
      // Denied
      const retryAfterMs = cooldownMs - msSinceLast;
      return {
        allowed: false,
        retryAfterMs,
        message: `You've used your free evaluations. Next free one is available in ${Math.ceil(retryAfterMs / (60 * 60 * 1000))} hours, or upgrade to Pro for unlimited access.`
      };
    });
  } catch (err) {
    console.error("Error checking usage:", err);
    return { allowed: false, retryAfterMs: 0, message: "Could not verify usage quota. Please try again later." };
  }
}

module.exports = { checkAndIncrementUsage };
