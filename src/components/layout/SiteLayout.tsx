import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth } from '@/context/AuthContext';
import { AccessDenied, Alert, PageLoader } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/supabase';

function ScrollToTop() {
  const { pathname } = useLocation();
  // Block body on purpose: scrollTo() returns a Promise in current Chrome, and an
  // effect must not return anything except a cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Client-side redirect. Used instead of react-router's <Navigate>, whose effect
 * returns navigate()'s result and triggers 'destroy is not a function' under React 19.
 */
export function Redirect({ to }: { to: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
  return null;
}

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header />
      {!isSupabaseConfigured && (
        <div className="container-site pt-4">
          <Alert tone="warning" title="Development mode — database not connected">
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to load the catalogue. Purchases are disabled.
          </Alert>
        </div>
      )}
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader label="Checking your session…" />;
  if (!user) return <Redirect to={`/signin?next=${encodeURIComponent(location.pathname + location.search)}`} />;
  return <Outlet />;
}

/** UX guard only — the database enforces admin rights on every query. */
export function RequireAdmin() {
  const { user, isAdmin, loading, profile } = useAuth();
  const location = useLocation();
  if (loading || (user && !profile)) return <PageLoader label="Checking permissions…" />;
  if (!user) return <Redirect to={`/signin?next=${encodeURIComponent(location.pathname)}`} />;
  if (!isAdmin) return <AccessDenied message="This area is restricted to store administrators." />;
  return <Outlet />;
}
