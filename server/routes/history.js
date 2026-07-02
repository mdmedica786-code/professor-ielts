const express = require('express');
const router = express.Router();
const { db } = require('../services/firebaseAdmin');
const { verifyAuth } = require('../middleware/verifyAuth');

function updateCriterion(critObj, newScore) {
  let obj = critObj || { sum: 0, count: 0, avg: 0, trend: [] };
  // Guard against unexpected types
  if (typeof newScore !== 'number') return obj;
  
  obj.sum += newScore;
  obj.count += 1;
  obj.avg = Math.round((obj.sum / obj.count) * 2) / 2; // nearest 0.5
  obj.trend.push(newScore);
  if (obj.trend.length > 20) {
    obj.trend.shift(); // keep last 20
  }
  return obj;
}

// GET /api/history - Fetch evaluation history for the user
router.get('/', verifyAuth, async (req, res, next) => {
  try {
    const historyRef = db.collection('users').doc(req.uid).collection('history');
    // Order by timestamp desc
    const snapshot = await historyRef.orderBy('timestamp', 'desc').limit(100).get();
    const history = [];
    snapshot.forEach(doc => {
      history.push(doc.data());
    });
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

// POST /api/history - Save evaluation and rollup analytics
router.post('/', verifyAuth, async (req, res, next) => {
  try {
    const record = req.body;
    if (!record || !record.id) {
      return res.status(400).json({ success: false, error: 'Invalid record' });
    }

    const userRef = db.collection('users').doc(req.uid);
    const historyDocRef = userRef.collection('history').doc(record.id);
    const analyticsDocRef = userRef.collection('analytics').doc('summary');

    await db.runTransaction(async (transaction) => {
      // 1. Write the history record
      transaction.set(historyDocRef, record);

      // 2. Read existing analytics summary
      const analyticsDoc = await transaction.get(analyticsDocRef);
      let analytics = analyticsDoc.exists ? analyticsDoc.data() : {
        totalEvals: 0,
        criteria: {},
        qTypes: { reading: {}, listening: {} },
        mistakeTags: {}
      };

      analytics.totalEvals = (analytics.totalEvals || 0) + 1;
      analytics.criteria = analytics.criteria || {};
      analytics.mistakeTags = analytics.mistakeTags || {};
      
      const evalData = record.evaluation || {};
      const scores = evalData.scores || {};

      // Roll up scores for Speaking and Writing
      if (scores.tr !== undefined) analytics.criteria.tr = updateCriterion(analytics.criteria.tr, scores.tr);
      if (scores.cc !== undefined) analytics.criteria.cc = updateCriterion(analytics.criteria.cc, scores.cc);
      if (scores.lr !== undefined) analytics.criteria.lr = updateCriterion(analytics.criteria.lr, scores.lr);
      if (scores.gra !== undefined) analytics.criteria.gra = updateCriterion(analytics.criteria.gra, scores.gra);
      if (scores.fc !== undefined) analytics.criteria.fc = updateCriterion(analytics.criteria.fc, scores.fc); // Speaking
      if (scores.pr !== undefined) analytics.criteria.pr = updateCriterion(analytics.criteria.pr, scores.pr); // Speaking

      // For Reading/Listening, if we had qType breakdowns we would roll them up here
      // For now, this is a placeholder where they can be injected once the evaluation returns them
      if (evalData.qTypes) {
        // e.g. evalData.qTypes = { tfng: { seen: 5, correct: 3 } }
        const kind = record.kind === 'reading' ? 'reading' : 'listening';
        analytics.qTypes = analytics.qTypes || { reading: {}, listening: {} };
        const targetQTypes = analytics.qTypes[kind] || {};
        
        for (const [qType, stats] of Object.entries(evalData.qTypes)) {
          if (!targetQTypes[qType]) targetQTypes[qType] = { seen: 0, correct: 0 };
          targetQTypes[qType].seen += stats.seen || 0;
          targetQTypes[qType].correct += stats.correct || 0;
        }
        analytics.qTypes[kind] = targetQTypes;
      }

      analytics.updatedAt = new Date().toISOString();

      transaction.set(analyticsDocRef, analytics, { merge: true });
    });

    res.json({ success: true, data: { id: record.id } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
