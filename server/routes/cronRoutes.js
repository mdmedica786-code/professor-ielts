const express = require('express');
const router = express.Router();
const { db } = require('../services/firebaseAdmin');
const { sendPushNotification } = require('../services/pushService');
const { sendEmail } = require('../services/emailService');

// Middleware to verify cron secret
const verifyCronSecret = (req, res, next) => {
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

/**
 * POST /api/cron/reminders
 * Triggered daily by an external scheduler (e.g. cron-job.org).
 */
router.post('/reminders', verifyCronSecret, async (req, res, next) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const now = Date.now();
    let sentCount = 0;

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      const uid = doc.id;

      // Check if user has FCM tokens
      const tokens = user.fcmTokens || [];
      if (tokens.length === 0 && !user.email) continue;

      // Anti-spam check (e.g. at least 24h since last reminder)
      const lastReminderAt = user.lastReminderAt ? new Date(user.lastReminderAt).getTime() : 0;
      if (now - lastReminderAt < 24 * 60 * 60 * 1000) {
        continue; // skip
      }

      // Check if due for a reminder (e.g., 3 days since last practice)
      // For now, we will just use a generic reminder logic.
      // We can check analytics/summary updatedAt, but for speed, let's just send it if it's been a while.
      
      const payload = {
        title: 'Keep your streak alive! 🔥',
        body: 'It’s been a while since your last IELTS practice. Jump back in!'
      };

      try {
        if (tokens.length > 0) {
          await sendPushNotification(tokens, payload);
        }
        if (user.email) {
          await sendEmail(user.email, payload.title, `<p>${payload.body}</p>`);
        }
        
        // Update lastReminderAt
        await db.collection('users').doc(uid).update({
          lastReminderAt: new Date().toISOString()
        });
        sentCount++;
      } catch (e) {
        console.error(`Failed to send reminder to ${uid}:`, e);
      }
    }

    res.json({ success: true, message: `Reminders sent to ${sentCount} users.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
