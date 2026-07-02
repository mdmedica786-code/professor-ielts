const express = require('express');
const router = express.Router();
const { db } = require('../services/firebaseAdmin');
const { checkAndIncrementUsage } = require('../services/usageService');
const { verifyAuth } = require('../middleware/verifyAuth');

router.post('/start', verifyAuth, async (req, res, next) => {
  try {
    const { section } = req.body;
    if (!section) {
      return res.status(400).json({ success: false, error: "Section is required" });
    }

    if (!req.uid) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Admin users shouldn't really spend quota, but we'll let checkAndIncrementUsage
    // run if we want, or we can just bypass for admin.
    // However, it's safer to bypass checking usage for admins, just create session.
    if (!req.isAdmin) {
      const result = await checkAndIncrementUsage(req.uid, req.isAnonymous);
      
      if (!result.allowed) {
        return res.status(402).json({
          success: false,
          error: result.message,
          retryAfterMs: result.retryAfterMs,
          upgradeRequired: true
        });
      }
    }

    const now = new Date();
    let maxCalls = 5;
    let expiresAt = new Date(now.getTime() + 90 * 60 * 1000);

    if (section === 'writing') {
      maxCalls = 10;
      expiresAt = new Date(now.getTime() + 90 * 60 * 1000);
    } else if (section === 'speaking') {
      maxCalls = 15;
      expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
    } else if (section === 'listening' || section === 'reading') {
      maxCalls = 5;
      expiresAt = new Date(now.getTime() + 90 * 60 * 1000);
    }

    const sessionRef = db.collection('testSessions').doc();
    await sessionRef.set({
      uid: req.uid,
      section,
      maxCalls,
      callsUsed: 0,
      expiresAt,
      createdAt: now
    });

    res.json({
      success: true,
      sessionId: sessionRef.id
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
