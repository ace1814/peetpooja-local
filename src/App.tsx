import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BillingPage } from './pages/BillingPage';
import { OrdersPage } from './pages/OrdersPage';
import { MenuPage } from './pages/MenuPage';
import { TablesPage } from './pages/TablesPage';
import { InventoryPage } from './pages/InventoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SetupPage } from './pages/SetupPage';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage, AuthSeedPage } from './pages/AuthCallbackPage';
import { isConfigured, resetClient } from './lib/supabase';

// Waiter join page — reads token from URL, stores credentials, redirects to billing
function JoinPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const decoded = JSON.parse(atob(token)) as { url: string; key: string; restaurantName?: string };
      if (!decoded.url || !decoded.key) throw new Error('Invalid token');
      sessionStorage.setItem('sb_url', decoded.url);
      sessionStorage.setItem('sb_anon_key', decoded.key);
      sessionStorage.setItem('sb_mode', 'waiter');
      sessionStorage.setItem('sb_restaurant', decoded.restaurantName ?? '');
      resetClient();
      navigate('/billing', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  }, [params, navigate]);

  const restaurantName = params.get('token')
    ? (() => { try { return (JSON.parse(atob(params.get('token')!)) as { restaurantName?: string }).restaurantName ?? ''; } catch { return ''; } })()
    : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">
          {restaurantName ? `Joining ${restaurantName}…` : 'Loading…'}
        </p>
      </div>
    </div>
  );
}

// Guard: owner-only routes
function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { isOwner, isWaiter, loading } = useAuth();
  if (loading) return null;
  if (isWaiter) return <Navigate to="/billing" replace />;
  if (!isOwner) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isOwner, isWaiter, loading } = useAuth();
  const configured = isConfigured();

  if (!configured) return <Navigate to="/setup" replace />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isOwner && !isWaiter) return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/billing" replace />} />
        <Route path="billing" element={<BillingPage />} />

        {/* Owner-only routes */}
        <Route path="orders"    element={<OwnerRoute><OrdersPage /></OwnerRoute>} />
        <Route path="menu"      element={<OwnerRoute><MenuPage /></OwnerRoute>} />
        <Route path="tables"    element={<OwnerRoute><TablesPage /></OwnerRoute>} />
        <Route path="inventory" element={<OwnerRoute><InventoryPage /></OwnerRoute>} />
        <Route path="reports"   element={<OwnerRoute><ReportsPage /></OwnerRoute>} />
        <Route path="settings"  element={<OwnerRoute><SettingsPage /></OwnerRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/setup"         element={<SetupPage />} />
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/auth/seed"     element={<AuthSeedPage />} />
            <Route path="/join"          element={<JoinPage />} />

            {/* Protected app routes */}
            <Route path="/*" element={<AppRoutes />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
