const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

let auth = null;
let db = null;
let firebaseInitError = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    // Fix for literal '\n' strings that sometimes happen with environment variables
    if (serviceAccount.private_key && serviceAccount.private_key.includes('\\n')) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    // In v14, we use the modular API
    const app = initializeApp({
      credential: cert(serviceAccount)
    });
    
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase Admin initialized successfully.");
  } else {
    console.warn("FIREBASE_SERVICE_ACCOUNT env var missing. Auth operations will fail.");
  }
} catch (error) {
  firebaseInitError = error.message;
  console.error("Failed to initialize Firebase Admin:", error.message);
}

module.exports = { 
  auth, 
  db, 
  getFirebaseInitError: () => firebaseInitError,
  getAppsLength: () => getApps().length
};
