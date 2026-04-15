import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';

const titles: Record<string, string> = {
  '/billing':   'Billing',
  '/orders':    'Invoice History',
  '/menu':      'Menu Management',
  '/tables':    'Table Management',
  '/inventory': 'Inventory',
  '/reports':   'Reports',
  '/settings':  'Settings',
};

export function AppShell() {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? 'PeetPooja';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        {/* Mobile bottom nav — hidden on desktop */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
