const express = require('express');
const { db } = require('../services/firebaseAdmin');
const { verifyAuth } = require('../middleware/verifyAuth');

const router = express.Router();

// GET /api/user/me
router.get('/me', async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.uid).get();
    
    if (!doc.exists) {
      return res.json({ success: true, plan: 'free', adsRemoved: false });
    }
    
    const data = doc.data();
    const premiumUntil = data.premiumUntil ? data.premiumUntil.toDate() : null;
    
    // Check if premium has expired
    if (premiumUntil && premiumUntil < new Date()) {
      return res.json({ success: true, plan: 'free', expired: true, adsRemoved: data.adsRemoved || false });
    }
    
    return res.json({
      success: true,
      plan: data.plan || 'free',
      premiumUntil,
      adsRemoved: data.adsRemoved || false
    });
  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch user data." });
  }
});

/**
 * POST /api/user/fcm-token
 * Body: { token: string }
 * Store an FCM token for push notifications.
 */
router.post("/fcm-token", verifyAuth, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: "Token required" });

    const userRef = db.collection("users").doc(req.uid);
    // Use arrayUnion to append token without duplicating
    const { FieldValue } = require("firebase-admin/firestore");
    await userRef.set(
      { fcmTokens: FieldValue.arrayUnion(token) },
      { merge: true }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
