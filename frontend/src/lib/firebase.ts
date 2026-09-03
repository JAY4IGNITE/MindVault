import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Public Firebase config (safe in frontend bundle)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyMockKeyForDev12345",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mindvault-local.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mindvault-local",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mindvault-local.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to local emulators if explicitly enabled
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('[MindVault] Connected to Firebase Local Emulators');
  } catch (e) {
    console.warn('[MindVault] Emulators already connected or failed to connect:', e);
  }
}
