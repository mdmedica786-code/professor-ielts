import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Initialize GoogleAuth for native platforms
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: '238060239349-ghcabf4q1gpl3q1frf78144k3k77s3a8.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        return await signInWithCredential(auth, credential);
      } catch (error) {
        console.error("Native Google Sign in error", error);
        throw error;
      }
    } else {
      const provider = new GoogleAuthProvider();
      try {
        // Try popup first, fallback to redirect if blocked
        return await signInWithPopup(auth, provider);
      } catch (error) {
        if (error.code === 'auth/popup-blocked') {
          return await signInWithRedirect(auth, provider);
        }
        throw error;
      }
    }
  };

  const setupRecaptcha = (containerId) => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
      });
    }
  };

  const signInWithPhone = async (phoneNumber, containerId) => {
    setupRecaptcha(containerId);
    const appVerifier = window.recaptchaVerifier;
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  };

  const signOut = () => {
    return firebaseSignOut(auth);
  };

  const signInAnonymously = async () => {
    return await firebaseSignInAnonymously(auth);
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signInWithPhone,
    signInAnonymously,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
