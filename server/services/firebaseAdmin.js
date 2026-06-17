const admin = require("firebase-admin");

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized successfully.");
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT env var missing. Auth operations will fail.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error.message);
}

const apps = admin.apps || [];
const auth = apps.length ? admin.auth() : null;
const db = apps.length ? admin.firestore() : null;

module.exports = { admin, auth, db };
