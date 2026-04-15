import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, googleProvider, signInWithPopup } from '../lib/firebase';
import { registerPlatformUser, getPlatformUser, isPlatformDbConfigured } from '../lib/platformDb';
import { isConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { GoogleButton } from './LoginPage';

export function SignUpPage() {
  const { firebaseUser, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Already signed in → skip straight to app or setup
  useEffect(() => {
    if (loading || busy) return;
    if (firebaseUser) {
      navigate(isConfigured() ? '/billing' : '/setup', { replace: true });
    }
  }, [firebaseUser, loading, busy, navigate]);

  const handleSignUp = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const { uid, email, displayName } = result.user;

      // If platform DB is configured, check if they already have an account
      if (isPlatformDbConfigured()) {
        const existing = await getPlatformUser(uid);
        if (existing) {
          // Already registered — send to login instead
          navigate('/login', { replace: true });
          return;
        }
        await registerPlatformUser(uid, email, displayName);
      }

      // New users always go through setup to connect their own database
      navigate(isConfigured() ? '/billing' : '/setup', { replace: true });
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('popup-closed')) return;
      setError(e instanceof Error ? e.message : 'Sign-up failed. Please try again.');
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
            <h2 className="text-xl font-bold font-display text-gray-900">Create your account</h2>
            <p className="text-gray-500 text-sm mt-1">
              Set up private billing for your restaurant in about 5 minutes.
            </p>
          </div>

          {/* What you get */}
          <div className="space-y-2.5">
            {[
              { icon: '🔒', text: 'Your own private database — nobody else can see your data' },
              { icon: '📱', text: 'Waiters take orders on their phones, synced in real-time' },
              { icon: '🖨️', text: '58mm thermal invoice printing & Excel export' },
            ].map(f => (
              <div key={f.text} className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">{f.icon}</span>
                <p className="text-sm text-gray-600">{f.text}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-center">
              {error}
            </div>
          )}

          <GoogleButton onClick={handleSignUp} loading={busy} label="Sign up with Google" />

          <p className="text-xs text-gray-400 text-center">
            By signing up you'll be guided to connect your own free Supabase database.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-red hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
