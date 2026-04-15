import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY     as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID  as string,
};

export const firebaseApp    = initializeApp(firebaseConfig);
export const auth           = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// Always show account-chooser so users can switch restaurants
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { signInWithPopup, signOut, onAuthStateChanged };
