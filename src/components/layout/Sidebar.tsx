import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { getSettings, getRawMaterials } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import type { RestaurantSettings, RawMaterial } from '../../types';

const ownerNavItems = [
  { to: '/billing',   icon: '🧾', label: 'Billing'   },
  { to: '/orders',    icon: '📋', label: 'Orders'    },
  { to: '/menu',      icon: '🍽️', label: 'Menu'      },
  { to: '/tables',    icon: '🪑', label: 'Tables'    },
  { to: '/inventory', icon: '📦', label: 'Inventory' },
  { to: '/reports',   icon: '📊', label: 'Reports'   },
  { to: '/settings',  icon: '⚙️', label: 'Settings'  },
];

const waiterNavItems = [
  { to: '/billing', icon: '🧾', label: 'Billing' },
];

export function Sidebar() {
  const { isOwner, isWaiter, signOut } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);

  const fetchSettings = useCallback(async () => {
    try { setSettings(await getSettings()); } catch {}
  }, []);

  const fetchMaterials = useCallback(async () => {
    try { setMaterials(await getRawMaterials()); } catch {}
  }, []);

  useEffect(() => {
    fetchSettings();
    if (isOwner) fetchMaterials();
  }, [fetchSettings, fetchMaterials, isOwner]);

  const lowStockCount = materials.filter(m => m.isActive && m.currentStock <= m.lowStockThreshold).length;
  const navItems = isWaiter ? waiterNavItems : ownerNavItems;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    // Hidden on mobile — mobile navigation is handled by MobileBottomNav in AppShell
    <aside className="hidden md:flex w-56 bg-gray-900 flex-col h-full shrink-0 no-print">
      {/* Logo */}
      <div className="px-3 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center text-white font-bold font-display text-sm shrink-0">P</div>
          <div className="min-w-0">
            <span className="text-white font-display font-semibold text-sm truncate block">
              {settings?.restaurantName ?? 'PeetPooja'}
            </span>
            {isWaiter && <span className="text-xs text-gray-400">Waiter</span>}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-colors text-sm font-medium',
              isActive
                ? 'bg-brand-red text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <span className="text-base shrink-0">{item.icon}</span>
            <span>{item.label}</span>
            {item.to === '/inventory' && lowStockCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {lowStockCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-700 space-y-2">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-xs w-full transition-colors"
        >
          <span>🚪</span> Sign Out
        </button>
        <p className="text-gray-500 text-xs">v2.0.0 — Cloud</p>
      </div>
    </aside>
  );
}
