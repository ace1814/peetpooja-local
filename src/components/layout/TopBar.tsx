import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSettings } from '../../lib/db';
import type { RestaurantSettings } from '../../types';

export function TopBar({ title }: { title?: string }) {
  const [time, setTime] = useState(new Date());
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const { isWaiter, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSettings = useCallback(async () => {
    try { setSettings(await getSettings()); } catch {}
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 no-print">
      {/* Left: logo on mobile (sidebar hidden), page title on desktop */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile: P logo + restaurant name */}
        <div className="md:hidden flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-brand-red rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0">P</div>
          <span className="text-sm font-semibold font-display text-gray-800 truncate max-w-[140px]">
            {settings?.restaurantName ?? 'PeetPooja'}
          </span>
        </div>
        {/* Desktop: page title */}
        <h1 className="hidden md:block text-base font-semibold font-display text-gray-800">{title ?? 'PeetPooja'}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Clock — hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-3 text-sm text-gray-500">
          <span>{format(time, 'dd MMM yyyy')}</span>
          <span className="font-mono font-medium text-gray-700">{format(time, 'HH:mm:ss')}</span>
        </div>
        {/* Mobile-only time (compact) */}
        <span className="sm:hidden font-mono text-xs font-medium text-gray-600">{format(time, 'HH:mm')}</span>

        {/* Sign-out for waiters (no bottom nav) */}
        {isWaiter && (
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
