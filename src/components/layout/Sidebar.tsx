import { NavLink } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { db } from '../../db/schema';

const navItems = [
  { to: '/billing',   icon: '🧾', label: 'Billing'   },
  { to: '/orders',    icon: '📋', label: 'Orders'    },
  { to: '/menu',      icon: '🍽️', label: 'Menu'      },
  { to: '/tables',    icon: '🪑', label: 'Tables'    },
  { to: '/inventory', icon: '📦', label: 'Inventory' },
  { to: '/reports',   icon: '📊', label: 'Reports'   },
  { to: '/settings',  icon: '⚙️', label: 'Settings'  },
];

export function Sidebar() {
  const lowStockCount = useLiveQuery(async () => {
    const materials = await db.rawMaterials.filter(m => m.isActive).toArray();
    return materials.filter(m => m.currentStock <= m.lowStockThreshold).length;
  }, []) ?? 0;

  const settings = useLiveQuery(() => db.settings.get(1));

  return (
    <aside className="w-16 md:w-56 bg-gray-900 flex flex-col h-full shrink-0 no-print">
      {/* Logo */}
      <div className="px-3 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center text-white font-bold font-display text-sm shrink-0">P</div>
          <span className="hidden md:block text-white font-display font-semibold text-sm truncate">
            {settings?.restaurantName ?? 'PeetPooja'}
          </span>
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
            <span className="hidden md:block">{item.label}</span>
            {item.to === '/inventory' && lowStockCount > 0 && (
              <span className="hidden md:flex ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 items-center justify-center">
                {lowStockCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Version */}
      <div className="px-3 py-3 border-t border-gray-700">
        <p className="hidden md:block text-gray-500 text-xs">v1.0.0 — Local</p>
      </div>
    </aside>
  );
}
