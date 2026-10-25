import { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider } from './context/AppContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { useLiveEvent } from './hooks/useRealtime';
import { FeedbackProvider } from './context/FeedbackContext';
import { PageChromeProvider } from './context/PageChromeContext';
import { useAuth } from './hooks/useAuth';
import { useFetchingCount } from './hooks/useLiveQuery';
import Loader, { PageFallback } from './components/Loader/Loader';
import Seo from './components/common/Seo';
import { LogoMark } from './components/ui/Logo';
import PublicLayout from './components/public/PublicLayout';
import CustomerLayout from './components/customer/CustomerLayout';
import CompanyLayout from './components/company/CompanyLayout';
import { Public, Customer, Company, preloadGroup } from './routes';


/** Thin gradient bar while any screen is loading its first data. */
function FetchProgress() {
  const fetching = useFetchingCount();
  return (
    <div className="route-progress" aria-hidden="true">
      <span style={{ width: fetching ? '72%' : '100%', opacity: fetching ? 1 : 0 }} />
    </div>
  );
}

function PendingApproval() {
  const { user, logout, refreshUser } = useAuth();
  useLiveEvent('workspace:updated', () => refreshUser().catch(() => {}));
  useEffect(() => {
    const id = window.setInterval(() => refreshUser().catch(() => {}), 15000);
    return () => window.clearInterval(id);
  }, [refreshUser]);
  const rejected = ['rejected', 'suspended'].includes(user?.approvalStatus);
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6">
      <section className="card w-full max-w-lg p-8 text-center animate-rise-in">
        <div className="mx-auto mb-6 w-fit"><LogoMark size={44} animated={!rejected} /></div>
        <h1 className="text-2xl font-bold">{rejected ? 'Registration not approved' : 'Your workspace is almost ready'}</h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] text-muted">
          {rejected
            ? 'A Super Admin reviewed this company and did not approve it. Contact FleetOS support to update your documents.'
            : 'A Super Admin is reviewing your company documents. This page opens your workspace automatically the moment you are approved.'}
        </p>
        <div className="well mt-6 flex items-center justify-between gap-3 p-4 text-left">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{user?.companyName || user?.company?.name || 'Your company'}</p>
            <p className="text-xs text-subtle">{user?.email}</p>
          </div>
          <span className={`badge ${rejected ? 'badge-danger' : 'badge-warning'}`}>
            <span className="material-symbols-outlined">{rejected ? 'block' : 'hourglass_top'}</span>
            {user?.approvalStatus || 'pending'}
          </span>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn btn-secondary">Back to website</Link>
          <button type="button" onClick={logout} className="btn btn-ghost">Sign out</button>
        </div>
      </section>
    </main>
  );
}

function RoleGate({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loader label={role === 'company' ? 'Opening your company workspace' : 'Signing you in'} />;
  if (!user || user.role !== role) {
    // A route never silently switches a visitor into a different portal.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search, role }} />;
  }
  if (role === 'company' && user.approvalStatus && user.approvalStatus !== 'approved') return <PendingApproval />;
  return children;
}

function RouteScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

function PublicPortal() {
  useEffect(() => { preloadGroup(Public); }, []);
  return (
    <PublicLayout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Public.Home />} />
          <Route path="/login" element={<Public.Login />} />
          <Route path="/register" element={<Public.Register />} />
          <Route path="/company/register" element={<Public.CompanyRegister />} />
          <Route path="/about" element={<Public.About />} />
          <Route path="/contact" element={<Public.Contact />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </PublicLayout>
  );
}

function CustomerPortal() {
  useEffect(() => { preloadGroup(Customer); }, []);
  return (
    <RoleGate role="customer">
      <PageChromeProvider>
        <CustomerLayout>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/customer" element={<Navigate to="/customer/companies" replace />} />
              <Route path="/customer/dashboard" element={<Navigate to="/customer/companies" replace />} />
              <Route path="/customer/companies" element={<Customer.Companies />} />
              <Route path="/customer/company/:id" element={<Customer.CompanyDetails />} />
              <Route path="/customer/customize-booking" element={<Customer.CustomizeBooking />} />
              <Route path="/customer/booking-summary" element={<Customer.BookingSummary />} />
              <Route path="/customer/live-tracking" element={<Customer.LiveTracking />} />
              <Route path="/customer/service-review" element={<Customer.ServiceReview />} />
              <Route path="/customer/profile" element={<Customer.Profile />} />
              <Route path="/customer/bookings" element={<Customer.Bookings />} />
              <Route path="/customer/reviews" element={<Customer.Reviews />} />
              <Route path="/customer/payments" element={<Customer.Payments />} />
              <Route path="/customer/notifications" element={<Customer.Notifications />} />
              <Route path="/customer/chat/:companyId?" element={<Customer.Chat />} />
              <Route path="/customer/*" element={<Navigate to="/customer/companies" replace />} />
            </Routes>
          </Suspense>
        </CustomerLayout>
      </PageChromeProvider>
    </RoleGate>
  );
}

function CompanyPortal() {
  useEffect(() => { preloadGroup(Company); }, []);
  return (
    <RoleGate role="company">
      <PageChromeProvider>
        <CompanyLayout>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/company" element={<Navigate to="/company/dashboard" replace />} />
              <Route path="/company/dashboard" element={<Company.Dashboard />} />
              <Route path="/company/dispatch" element={<Company.Dispatch />} />
              <Route path="/company/bookings" element={<Company.Bookings />} />
              <Route path="/company/technicians" element={<Company.Technicians />} />
              <Route path="/company/inventory" element={<Company.Inventory />} />
              <Route path="/company/services" element={<Company.Services />} />
              <Route path="/company/customers" element={<Company.Customers />} />
              <Route path="/company/chat" element={<Company.Chat />} />
              <Route path="/company/reviews" element={<Company.Reviews />} />
              <Route path="/company/analytics" element={<Company.Analytics />} />
              <Route path="/company/details" element={<Company.Profile />} />
              <Route path="/company/settings" element={<Company.Settings />} />
              <Route path="/company/*" element={<Navigate to="/company/dashboard" replace />} />
            </Routes>
          </Suspense>
        </CompanyLayout>
      </PageChromeProvider>
    </RoleGate>
  );
}

function RoutedApp() {
  const { pathname } = useLocation();
  const isCompany = pathname.startsWith('/company') && pathname !== '/company/register';
  const isCustomer = pathname.startsWith('/customer');
  const role = isCompany ? 'company' : 'customer';

  return (
    <AppProvider key={role} expectedRole={role}>
      <RealtimeProvider>
        <RouteScrollManager />
        <Seo />
        <FetchProgress />
        {isCompany ? <CompanyPortal /> : isCustomer ? <CustomerPortal /> : <PublicPortal />}
      </RealtimeProvider>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <FeedbackProvider>
          <RoutedApp />
        </FeedbackProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
