import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useUser, useClerk, useSignIn } from '@clerk/clerk-react';
import { isConfigured, isWaiterMode } from '../lib/supabase';

interface AuthContextValue {
  isOwner: boolean;
  isWaiter: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const { signIn, isLoaded: signInLoaded } = useSignIn();

  const isOwner = !!isSignedIn && isConfigured();
  const isWaiter = !isSignedIn && isWaiterMode();
  const loading = !isLoaded;

  const signInWithGoogle = async () => {
    if (!signInLoaded || !signIn) throw new Error('Sign-in not ready');
    await signIn.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: `${window.location.origin}/auth/callback`,
      redirectUrlComplete: '/billing',
    });
  };

  const signOut = async () => {
    await clerkSignOut();
    // Keep Supabase credentials — owner set those up intentionally
    // Clear waiter session if present
    sessionStorage.removeItem('sb_url');
    sessionStorage.removeItem('sb_anon_key');
    sessionStorage.removeItem('sb_mode');
  };

  return (
    <AuthContext.Provider value={{ isOwner, isWaiter, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
