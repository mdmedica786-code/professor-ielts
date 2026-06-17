import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "bands-logic",
  appId: "1:238060239349:web:2389da739b5ff5fc2288bc",
  storageBucket: "bands-logic.firebasestorage.app",
  apiKey: "AIzaSyD4xsphkta5bSaEx9RwsMoxcGLchEWsRXo",
  authDomain: "bands-logic.firebaseapp.com",
  messagingSenderId: "238060239349",
  measurementId: "G-G4TLX76JH1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
