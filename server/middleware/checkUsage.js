const { checkAndIncrementUsage } = require('../services/usageService');

async function checkUsage(req, res, next) {
  // If no UID is present (e.g. bypassed by optionalAuth or dev setup), we allow.
  // The verifyAuth middleware should ensure req.uid is populated for protected routes.
  if (!req.uid) {
    return next();
  }

  const result = await checkAndIncrementUsage(req.uid);
  
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
