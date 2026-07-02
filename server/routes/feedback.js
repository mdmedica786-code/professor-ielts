const express = require('express');
const router = express.Router();
const { db } = require('../services/firebaseAdmin');
const { verifyAuth } = require('../middleware/verifyAuth');

/**
 * POST /api/feedback/grade
 * Submit user feedback for a generated grade.
 * Body: { evaluationId, section, modelBand, expectedBand, note, snippet }
 */
router.post('/grade', verifyAuth, async (req, res, next) => {
  try {
    const { evaluationId, section, modelBand, expectedBand, note, snippet } = req.body;

    if (!evaluationId) {
      return res.status(400).json({ success: false, error: 'evaluationId is required' });
    }

    const feedbackRef = db
      .collection('users')
      .doc(req.uid)
      .collection('gradeFeedback')
      .doc(); // Auto-generate ID

    await feedbackRef.set({
      id: feedbackRef.id,
      evaluationId,
      section: section || 'unknown',
      modelBand: modelBand || null,
      expectedBand: expectedBand || null,
      note: note || '',
      snippet: snippet || '',
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, data: { id: feedbackRef.id } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
