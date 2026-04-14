import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { BillingPage } from './pages/BillingPage';
import { OrdersPage } from './pages/OrdersPage';
import { MenuPage } from './pages/MenuPage';
import { TablesPage } from './pages/TablesPage';
import { InventoryPage } from './pages/InventoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { seedDatabase } from './db/seed';

function AppRoutes() {
  useEffect(() => {
    seedDatabase().catch(console.error);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/billing" replace />} />
        <Route path="billing"   element={<BillingPage />} />
        <Route path="orders"    element={<OrdersPage />} />
        <Route path="menu"      element={<MenuPage />} />
        <Route path="tables"    element={<TablesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="reports"   element={<ReportsPage />} />
        <Route path="settings"  element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}
