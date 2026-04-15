import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { auth, onAuthStateChanged, signOut as firebaseSignOut } from '../lib/firebase';
import { isConfigured, isWaiterMode, resetClient, activateUser, deactivateUser } from '../lib/supabase';

interface AuthContextValue {
  firebaseUser: User | null;
  isOwner: boolean;
  isWaiter: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase persists auth state in localStorage automatically across page loads
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        activateUser(user.uid); // switch to this user's Supabase credentials
      } else {
        deactivateUser();
      }
      setFirebaseUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    deactivateUser(); // clears active UID + cached client; keeps localStorage creds intact
    // Clear waiter session (if any)
    sessionStorage.removeItem('sb_url');
    sessionStorage.removeItem('sb_anon_key');
    sessionStorage.removeItem('sb_mode');
    sessionStorage.removeItem('sb_restaurant');
    resetClient();
  };

  // Owner = signed in with Firebase + has a Supabase project configured
  const isOwner  = !!firebaseUser && isConfigured();
  // Waiter = no Firebase auth + has sessionStorage token from invite link
  const isWaiter = !firebaseUser && isWaiterMode();

  return (
    <AuthContext.Provider value={{ firebaseUser, isOwner, isWaiter, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
