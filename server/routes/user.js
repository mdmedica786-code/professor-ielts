const express = require('express');
const { db } = require('../services/firebaseAdmin');

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

module.exports = router;
