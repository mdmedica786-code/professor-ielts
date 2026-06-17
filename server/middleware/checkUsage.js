const { checkAndIncrementUsage } = require('../services/usageService');

async function checkUsage(req, res, next) {
  // If no UID is present (e.g. bypassed by optionalAuth or dev setup), we allow.
  // The verifyAuth middleware should ensure req.uid is populated for protected routes.
  if (!req.uid) {
    return next();
  }

  // Admin / Pro User Override
  if (req.userEmail === 'mdmedica786@gmail.com') {
    return next();
  }

  const result = await checkAndIncrementUsage(req.uid, req.isAnonymous);
  
  if (!result.allowed) {
    return res.status(402).json({
      success: false,
      error: result.message,
      retryAfterMs: result.retryAfterMs,
      upgradeRequired: true
    });
  }

  next();
}

module.exports = { checkUsage };
