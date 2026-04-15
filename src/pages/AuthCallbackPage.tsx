import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { seedInitialData } from '../lib/db';
import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export function AuthCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      afterSignInUrl="/auth/seed"
      afterSignUpUrl="/auth/seed"
    />
  );
}

// Separate page that seeds data after auth then redirects to billing
export function AuthSeedPage() {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();
  const seeded = useRef(false);

  useEffect(() => {
    if (!isLoaded || seeded.current) return;
    if (isSignedIn) {
      seeded.current = true;
      seedInitialData()
        .catch(() => {})
        .finally(() => navigate('/billing', { replace: true }));
    } else {
      navigate('/login', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Setting up your account…</p>
      </div>
    </div>
  );
}
