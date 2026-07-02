const { checkAndIncrementUsage } = require('../services/usageService');
const { db } = require('../services/firebaseAdmin');

async function checkUsage(req, res, next) {
  // If no UID is present (e.g. bypassed by optionalAuth or dev setup), we allow.
  // The verifyAuth middleware should ensure req.uid is populated for protected routes.
  if (!req.uid) {
    return next();
  }

  // Admin override via Firebase custom claims (set via Firebase Admin SDK)
  if (req.isAdmin) {
    return next();
  }

  // Pre-paid test session check
  const sessionId = req.headers['x-test-session-id'];
  if (sessionId && db) {
    try {
      const sessionRef = db.collection('testSessions').doc(sessionId);
      const sessionAllowed = await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(sessionRef);
        if (!doc.exists) return false;
        
        const data = doc.data();
        const now = new Date();
        const expiresAt = data.expiresAt ? data.expiresAt.toDate() : new Date(0); // Fallback if missing
        
        if (data.uid !== req.uid || now >= expiresAt || data.callsUsed >= data.maxCalls) return false;
        
        transaction.update(sessionRef, {
          callsUsed: (data.callsUsed || 0) + 1
        });
        return true;
      });

      if (sessionAllowed) {
        return next();
      } else {
        return res.status(402).json({
          success: false,
          error: "Test session invalid or expired. Please restart the test.",
          upgradeRequired: false
        });
      }
    } catch (err) {
      console.error("Error validating test session:", err);
      return res.status(500).json({ success: false, error: "Error validating test session." });
    }
  }

  const result = await checkAndIncrementUsage(req.uid, req.isAnonymous);
  
  if (!result.allowed) {
    return res.status(402).json({
      success: false,
      error: result.message,
      retryAfterMs: result.retryAfterMs,
      upgradeRequired: true
    });
  }

  next();
}

module.exports = { checkUsage };
