import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { seedInitialData } from '../lib/db';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { navigate('/setup', { replace: true }); return; }

    sb.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // Seed default menu/tables/materials on first login (skips if data exists)
        try { await seedInitialData(); } catch {}
        navigate('/billing', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Signing you in…</p>
      </div>
    </div>
  );
}
