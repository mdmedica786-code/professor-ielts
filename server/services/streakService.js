const { db } = require('./firebaseAdmin');

// XP awards per activity type
const XP_TABLE = {
  speaking: 25,
  writing: 30,
  reading: 15,
  listening: 15,
  default: 20,
};

// Badge definitions — unlocked when threshold is met
const BADGE_DEFS = [
  { id: 'first_eval',    name: 'First Steps',      icon: '🎯', desc: 'Complete your first evaluation',      threshold: (s) => s.totalEvals >= 1 },
  { id: 'streak_3',      name: 'On Fire',           icon: '🔥', desc: '3-day practice streak',               threshold: (s) => s.streak >= 3 },
  { id: 'streak_7',      name: 'Week Warrior',      icon: '⚡', desc: '7-day practice streak',               threshold: (s) => s.streak >= 7 },
  { id: 'streak_30',     name: 'Monthly Master',    icon: '🏆', desc: '30-day practice streak',              threshold: (s) => s.streak >= 30 },
  { id: 'xp_100',        name: 'Rising Star',       icon: '⭐', desc: 'Earn 100 XP',                        threshold: (s) => s.xp >= 100 },
  { id: 'xp_500',        name: 'Dedicated Learner', icon: '💎', desc: 'Earn 500 XP',                        threshold: (s) => s.xp >= 500 },
  { id: 'xp_1000',       name: 'IELTS Champion',    icon: '👑', desc: 'Earn 1,000 XP',                      threshold: (s) => s.xp >= 1000 },
  { id: 'all_sections',  name: 'Well-Rounded',      icon: '🌟', desc: 'Practice all 4 IELTS sections',      threshold: (s) => s.sectionsUsed && s.sectionsUsed.length >= 4 },
  { id: 'evals_10',      name: 'Practice Pro',      icon: '📚', desc: 'Complete 10 evaluations',            threshold: (s) => s.totalEvals >= 10 },
  { id: 'evals_50',      name: 'Evaluation Expert', icon: '🎓', desc: 'Complete 50 evaluations',            threshold: (s) => s.totalEvals >= 50 },
];

/**
 * Helper: check if two Date objects fall on the same calendar day (UTC).
 */
function isSameDay(d1, d2) {
  return d1.getUTCFullYear() === d2.getUTCFullYear() &&
         d1.getUTCMonth() === d2.getUTCMonth() &&
         d1.getUTCDate() === d2.getUTCDate();
}

/**
 * Helper: check if d1 is exactly 1 calendar day before d2 (UTC).
 */
function isYesterday(d1, d2) {
  const yesterday = new Date(d2);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return isSameDay(d1, yesterday);
}

/**
 * Record a practice activity for the user (called after every successful evaluation).
 * Awards XP, maintains streak, checks badge thresholds.
 *
 * @param {string} uid - Firebase user ID
 * @param {string} section - 'speaking' | 'writing' | 'reading' | 'listening'
 * @returns {Promise<Object>} Updated stats + any newly unlocked badges
 */
async function recordActivity(uid, section = 'default') {
  if (!db) {
    console.warn('Firestore not configured, skipping streak recording.');
    return null;
  }

  const userRef = db.collection('users').doc(uid);
  const xpEarned = XP_TABLE[section] || XP_TABLE.default;

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(userRef);
      const now = new Date();
      const data = doc.exists ? doc.data() : {};

      // Current stats
      let xp = (data.xp || 0) + xpEarned;
      let streak = data.streak || 0;
      let totalEvals = (data.totalEvals || 0) + 1;
      let sectionsUsed = data.sectionsUsed || [];
      const existingBadges = data.badges || [];
      const lastPracticeDate = data.lastPracticeDate ? data.lastPracticeDate.toDate() : null;

      // Streak logic
      if (lastPracticeDate) {
        if (isSameDay(lastPracticeDate, now)) {
          // Already practiced today — streak stays the same
        } else if (isYesterday(lastPracticeDate, now)) {
          // Practiced yesterday — streak continues!
          streak += 1;
        } else {
          // Missed a day — streak resets
          streak = 1;
        }
      } else {
        // First ever practice
        streak = 1;
      }

      // Track which sections have been used
      if (section !== 'default' && !sectionsUsed.includes(section)) {
        sectionsUsed = [...sectionsUsed, section];
      }

      // Check for new badges
      const stats = { xp, streak, totalEvals, sectionsUsed };
      const newBadges = [];
      for (const badge of BADGE_DEFS) {
        if (!existingBadges.includes(badge.id) && badge.threshold(stats)) {
          newBadges.push(badge.id);
        }
      }

      const allBadges = [...existingBadges, ...newBadges];

      // Write to Firestore
      const update = {
        xp,
        streak,
        totalEvals,
        sectionsUsed,
        badges: allBadges,
        lastPracticeDate: now,
      };

      if (doc.exists) {
        transaction.update(userRef, update);
      } else {
        transaction.set(userRef, { ...update, plan: 'free', createdAt: now });
      }

      return {
        xp,
        xpEarned,
        streak,
        totalEvals,
        badges: allBadges,
        newBadges: newBadges.map((id) => BADGE_DEFS.find((b) => b.id === id)),
      };
    });
  } catch (err) {
    console.error('Error recording activity:', err);
    return null;
  }
}

/**
 * Get the current gamification stats for a user.
 *
 * @param {string} uid
 * @returns {Promise<Object>}
 */
async function getStats(uid) {
  if (!db) return { xp: 0, streak: 0, totalEvals: 0, badges: [], badgeDetails: [] };

  try {
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) return { xp: 0, streak: 0, totalEvals: 0, badges: [], badgeDetails: [] };

    const data = doc.data();
    const now = new Date();
    let streak = data.streak || 0;
    const lastPractice = data.lastPracticeDate ? data.lastPracticeDate.toDate() : null;

    // If they haven't practiced today or yesterday, streak is broken
    if (lastPractice && !isSameDay(lastPractice, now) && !isYesterday(lastPractice, now)) {
      streak = 0;
    }

    const badgeIds = data.badges || [];
    const badgeDetails = badgeIds.map((id) => BADGE_DEFS.find((b) => b.id === id)).filter(Boolean);

    return {
      xp: data.xp || 0,
      streak,
      totalEvals: data.totalEvals || 0,
      badges: badgeIds,
      badgeDetails,
    };
  } catch (err) {
    console.error('Error fetching stats:', err);
    return { xp: 0, streak: 0, totalEvals: 0, badges: [], badgeDetails: [] };
  }
}

module.exports = { recordActivity, getStats, BADGE_DEFS };
