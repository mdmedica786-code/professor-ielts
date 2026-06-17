const { auth } = require("../services/firebaseAdmin");

async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized. Please sign in.", upgradeRequired: false });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!auth) {
      throw new Error("Firebase auth not configured on server.");
    }
    const decodedToken = await auth.verifyIdToken(token);
    req.uid = decodedToken.uid;
    req.userEmail = decodedToken.email;
    next();
  } catch (error) {
    console.error("Auth verification failed:", error.message);
    return res.status(401).json({ success: false, error: "Invalid or expired token.", upgradeRequired: false });
  }
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  
  const token = authHeader.split(" ")[1];
  try {
    if (auth) {
      const decodedToken = await auth.verifyIdToken(token);
      req.uid = decodedToken.uid;
      req.userEmail = decodedToken.email;
    }
  } catch (err) {
    // Ignore invalid tokens for optional endpoints
  }
  next();
}

module.exports = { verifyAuth, optionalAuth };
