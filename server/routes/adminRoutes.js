const express = require('express');
const { verifyAuth } = require('../middleware/verifyAuth');
const { auth, db } = require('../services/firebaseAdmin');

const router = express.Router();

const ADMIN_EMAIL = 'mdmedica786@gmail.com';

// Middleware to restrict access to admin only
function requireAdmin(req, res, next) {
  if (req.userEmail !== ADMIN_EMAIL) {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin access required.' });
  }
  next();
}

// POST /api/admin/grant-pro
router.post('/grant-pro', verifyAuth, requireAdmin, async (req, res) => {
  const { email, days = 30, tier = 'pro' } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Student email is required.' });
  }

  try {
    // 1. Look up the user by email in Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;

    // 2. Calculate expiration date
    const premiumUntil = new Date();
    premiumUntil.setDate(premiumUntil.getDate() + days);

    // 3. Update the Firestore user document
    await db.collection('users').doc(uid).set({
      plan: tier, // 'pro' or 'ultra'
      premiumUntil: premiumUntil
    }, { merge: true });

    return res.json({ 
      success: true, 
      message: `Successfully granted ${tier.toUpperCase()} to ${email} for ${days} days.` 
    });
    
  } catch (err) {
    console.error('Admin grant-pro error:', err);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ success: false, error: 'User not found in Firebase Authentication. Tell them to sign up first.' });
    }
    return res.status(500).json({ success: false, error: 'Failed to grant Pro access.' });
  }
});

module.exports = router;
