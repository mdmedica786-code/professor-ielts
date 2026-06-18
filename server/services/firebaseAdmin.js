const admin = require("firebase-admin");

let firebaseInitError = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    // Fix for literal '\n' strings that sometimes happen with environment variables
    if (serviceAccount.private_key && serviceAccount.private_key.includes('\\n')) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized successfully.");
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT env var missing. Auth operations will fail.");
  }
} catch (error) {
  firebaseInitError = error.message;
  console.error("Failed to initialize Firebase Admin:", error.message);
}

const apps = admin.apps || [];
const auth = apps.length ? admin.auth() : null;
const db = apps.length ? admin.firestore() : null;

module.exports = { admin, auth, db, getFirebaseInitError: () => firebaseInitError };
