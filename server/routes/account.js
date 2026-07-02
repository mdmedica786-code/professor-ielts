const express = require('express');
const router = express.Router();
const { db, admin } = require('../services/firebaseAdmin');
const { verifyAuth } = require('../middleware/verifyAuth');

/**
 * POST /api/account/delete
 * Delete the user's account and all associated data.
 */
router.post('/delete', verifyAuth, async (req, res, next) => {
  try {
    const uid = req.uid;
    const userRef = db.collection('users').doc(uid);

    // Recursively delete the user document and all subcollections
    // This requires the firebase-admin/firestore recursiveDelete method
    await db.recursiveDelete(userRef);

    // Delete the user from Firebase Auth
    await admin.auth().deleteUser(uid);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/account/export
 * Export all user data as a JSON file.
 */
router.get('/export', verifyAuth, async (req, res, next) => {
  try {
    const uid = req.uid;
    const userRef = db.collection('users').doc(uid);
    const exportData = {
      profile: {},
      history: [],
      analytics: {},
      vocab: []
    };

    // Get profile
    const profileDoc = await userRef.get();
    if (profileDoc.exists) exportData.profile = profileDoc.data();

    // Get analytics
    const analyticsDoc = await userRef.collection('analytics').doc('summary').get();
    if (analyticsDoc.exists) exportData.analytics = analyticsDoc.data();

    // Get history
    const historySnap = await userRef.collection('history').get();
    historySnap.forEach(doc => exportData.history.push(doc.data()));

    // Get vocab
    const vocabSnap = await userRef.collection('vocab').get();
    vocabSnap.forEach(doc => exportData.vocab.push(doc.data()));

    // Return as a downloadable JSON file
    res.setHeader('Content-disposition', 'attachment; filename=bandlogic_data_export.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
