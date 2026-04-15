import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';

const ownerNavItems = [
  { to: '/billing',   icon: '🧾', label: 'Billing'   },
  { to: '/orders',    icon: '📋', label: 'Orders'    },
  { to: '/menu',      icon: '🍽️', label: 'Menu'      },
  { to: '/tables',    icon: '🪑', label: 'Tables'    },
  { to: '/inventory', icon: '📦', label: 'Stock'     },
  { to: '/reports',   icon: '📊', label: 'Reports'   },
  { to: '/settings',  icon: '⚙️', label: 'Settings'  },
];

/**
 * Bottom navigation bar — visible only on mobile (hidden md:hidden).
 * For waiters there's only one nav item so we skip rendering the bar.
 */
export function MobileBottomNav() {
  const { isOwner } = useAuth();

  // Waiters have no navigation; billing is the only screen
  if (!isOwner) return null;

  return (
    <nav className="md:hidden flex bg-gray-900 border-t border-gray-700 shrink-0 no-print safe-area-bottom overflow-x-auto scrollbar-none">
      {ownerNavItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => clsx(
            'flex flex-col items-center justify-center py-2 flex-1 min-w-[3.5rem] transition-colors',
            isActive ? 'text-brand-red' : 'text-gray-400 hover:text-white'
          )}
        >
          <span className="text-lg leading-none">{item.icon}</span>
          <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
