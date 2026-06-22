const express = require('express');
const { verifyAuth } = require('../middleware/verifyAuth');
const { auth, db } = require('../services/firebaseAdmin');

const router = express.Router();

// Seed admin: first admin bootstrapped via this email.
// After that, use Firebase custom claims: admin.setCustomUserClaims(uid, { admin: true })
const SEED_ADMIN_EMAIL = 'mdmedica786@gmail.com';

// Middleware to restrict access to admin only (via Firebase custom claim)
function requireAdmin(req, res, next) {
  // Allow seed admin OR anyone with the admin custom claim
  if (req.isAdmin || req.userEmail === SEED_ADMIN_EMAIL) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Forbidden: Admin access required.' });
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
    return res.status(500).json({ success: false, error: `Failed to grant access: ${err.message}` });
  }
});

// POST /api/admin/set-admin — promote another user to admin via custom claims
router.post('/set-admin', verifyAuth, requireAdmin, async (req, res) => {
  const { email, revoke = false } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required.' });
  }

  try {
    const userRecord = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(userRecord.uid, { admin: !revoke });
    return res.json({
      success: true,
      message: revoke
        ? `Revoked admin from ${email}.`
        : `Granted admin to ${email}. They must sign out and back in for the claim to take effect.`
    });
  } catch (err) {
    console.error('Admin set-admin error:', err);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
