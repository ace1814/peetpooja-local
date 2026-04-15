import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, googleProvider, signInWithPopup, signOut } from '../lib/firebase';
import { getPlatformUser, registerPlatformUser, isPlatformDbConfigured } from '../lib/platformDb';
import { isConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { firebaseUser, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Already signed in from a previous session → skip straight to the app
  useEffect(() => {
    if (loading || busy) return;
    if (firebaseUser) {
      navigate(isConfigured() ? '/billing' : '/setup', { replace: true });
    }
  }, [firebaseUser, loading, busy, navigate]);

  const handleSignIn = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const { uid, email, displayName } = result.user;

      // If platform DB is configured, verify the user is already registered
      if (isPlatformDbConfigured()) {
        const existing = await getPlatformUser(uid);
        if (!existing) {
          await signOut(auth);
          setError('No account found. Please sign up first — it only takes a minute.');
          return;
        }
        // Update last-seen timestamp
        await registerPlatformUser(uid, email, displayName);
      }

      navigate(isConfigured() ? '/billing' : '/setup', { replace: true });
    } catch (e: unknown) {
      // User closed the popup — not an error worth showing
      if (e instanceof Error && e.message.includes('popup-closed')) return;
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center text-white font-bold text-lg">P</div>
          <span className="text-2xl font-bold font-display text-gray-900">PeetPooja Billing</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold font-display text-gray-900">Welcome back 👋</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to access your restaurant dashboard.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-center">
              {error}
              {error.includes('sign up') && (
                <div className="mt-2">
                  <Link to="/signup" className="text-brand-red font-semibold underline">
                    Create an account →
                  </Link>
                </div>
              )}
            </div>
          )}

          <GoogleButton onClick={handleSignIn} loading={busy} label="Sign in with Google" />

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Waiter notice */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Are you a waiter?</p>
            <p className="text-sm text-gray-500">
              Ask your owner to share the waiter link with you. Open it on your phone — no login needed.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 text-xs text-gray-400 px-1">
          <span>
            New here?{' '}
            <Link to="/signup" className="text-brand-red hover:underline font-medium">Create account</Link>
          </span>
          <button
            onClick={() => { localStorage.removeItem('sb_url'); localStorage.removeItem('sb_anon_key'); window.location.href = '/setup'; }}
            className="hover:text-gray-600"
          >
            Re-run setup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Google button ─────────────────────────────────────
export function GoogleButton({
  onClick, loading, label,
}: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60 transition-colors"
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden>
          <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
          <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
          <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
          <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
        </svg>
      )}
      {loading ? 'Opening Google…' : label}
    </button>
  );
}
