import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import './App.css'
import { AppProvider } from './context/AppContext'
import { useAuth } from './hooks/useAuth'

// Lazy-loaded routes for faster initial load (code splitting)
const Home = lazy(() => import('./pages/public/Home/Home'))
const Login = lazy(() => import('./pages/public/Login/Login'))
const Register = lazy(() => import('./pages/public/Register/Register'))
const About = lazy(() => import('./pages/public/About/About'))
const Contact = lazy(() => import('./pages/public/Contact/Contact'))
const CompanyRegister = lazy(() => import('./pages/public/CompanyRegister/CompanyRegister'))

// Customer pages
const CompanyDetails = lazy(() => import('./pages/customer/CompanyDetails/CompanyDetails'))
const CustomizeBooking = lazy(() => import('./pages/customer/Booking/CustomizeBooking'))
const BookingSummary = lazy(() => import('./pages/customer/Booking/BookingSummary'))
const LiveTracking = lazy(() => import('./pages/customer/Booking/LiveTracking'))
const ServiceReview = lazy(() => import('./pages/customer/Booking/ServiceReview'))
const Profile = lazy(() => import('./pages/customer/Profile/Profile'))
const Bookings = lazy(() => import('./pages/customer/Bookings/Bookings'))
const Reviews = lazy(() => import('./pages/customer/Reviews/Reviews'))
const Chat = lazy(() => import('./pages/customer/Chat/Chat'))
const Companies = lazy(() => import('./pages/customer/Companies/Companies'))
const Payments = lazy(() => import('./pages/customer/Payments/Payments'))
const Notifications = lazy(() => import('./pages/customer/Notifications/Notifications'))

// Company pages
const CompanyDashboard = lazy(() => import('./pages/company/Dashboard/CompanyDashboard'))
const CompanyInventory = lazy(() => import('./pages/company/Inventory/CompanyInventory'))
const CompanyTechnicians = lazy(() => import('./pages/company/Technicians/CompanyTechnicians'))
const CompanyServices = lazy(() => import('./pages/company/Services/CompanyServices'))
const CompanyBookings = lazy(() => import('./pages/company/Bookings/CompanyBookings'))
const CompanyReviews = lazy(() => import('./pages/company/Reviews/CompanyReviews'))
const CompanyCustomers = lazy(() => import('./pages/company/Customers/CompanyCustomers'))
const CompanyAnalytics = lazy(() => import('./pages/company/Analytics/CompanyAnalytics'))
const CompanyChat = lazy(() => import('./pages/company/Chat/CompanyChat'))
const CompanySettings = lazy(() => import('./pages/company/Settings/CompanySettings'))
const CompanyProfileSettings = lazy(() => import('./pages/company/Details/CompanyDetails'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-md">
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
        <span className="font-nav-item text-nav-item text-on-surface-variant">Loading FleetOS...</span>
      </div>
    </div>
  )
}

function RoleGate({ role }) {
  const { user, loading, logout } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  // A route must never silently switch a visitor into a different portal.
  // Asking them to sign in keeps customer and company workspaces isolated.
  if (user.role !== role) return <Navigate to="/login" replace />
  if (role === 'company' && user.approvalStatus !== 'approved') {
    return (
      <main className="min-h-screen bg-[#f7f9fc] flex items-center justify-center p-6">
        <section className="max-w-lg bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-5">
            <span className="material-symbols-outlined">hourglass_top</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Approval in progress</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Your company registration has been received. Your portal will open as soon as a Super Admin approves the company.</p>
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left text-sm">
            <p className="font-semibold text-slate-900">{user.companyName}</p>
            <p className="text-slate-500 mt-1">Status: {user.approvalStatus || 'pending'}</p>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"><span className="material-symbols-outlined text-sm">refresh</span> Check status</button>
            <Link to="/" className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold">Public site</Link>
            <button onClick={logout} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold">Sign out</button>
          </div>
        </section>
      </main>
    )
  }
  return <Outlet />
}

function RouteScrollManager() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.startsWith('/company')) return;
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

function RoutedApp() {
  const location = useLocation()
  const companySurface = location.pathname.startsWith('/company')
  const companyRegisterSurface = location.pathname === '/company/register'

  return (
    <AppProvider key={companySurface ? 'company' : 'customer'} expectedRole={companySurface ? 'company' : 'customer'}>
      <RouteScrollManager />
      <div className={`app-shell ${companySurface && !companyRegisterSurface ? 'company-theme' : 'client-theme'} ${companyRegisterSurface ? 'company-register-theme' : ''}`}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/company/register" element={<CompanyRegister />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />

              <Route element={<RoleGate role="customer" />}>
                <Route path="/customer/dashboard" element={<Navigate to="/customer/companies" replace />} />
                <Route path="/customer/profile" element={<Profile />} />
                <Route path="/customer/bookings" element={<Bookings />} />
                <Route path="/customer/reviews" element={<Reviews />} />
                <Route path="/customer/payments" element={<Payments />} />
                <Route path="/customer/notifications" element={<Notifications />} />
                <Route path="/customer/company/:id" element={<CompanyDetails />} />
                <Route path="/customer/companies" element={<Companies />} />
                <Route path="/customer/customize-booking" element={<CustomizeBooking />} />
                <Route path="/customer/booking-summary" element={<BookingSummary />} />
                <Route path="/customer/live-tracking" element={<LiveTracking />} />
                <Route path="/customer/service-review" element={<ServiceReview />} />
                <Route path="/customer/chat/:companyId?" element={<Chat />} />
              </Route>

              <Route element={<RoleGate role="company" />}>
                <Route path="/company/dashboard" element={<CompanyDashboard />} />
                <Route path="/company/inventory" element={<CompanyInventory />} />
                <Route path="/company/technicians" element={<CompanyTechnicians />} />
                <Route path="/company/services" element={<CompanyServices />} />
                <Route path="/company/bookings" element={<CompanyBookings />} />
                <Route path="/company/reviews" element={<CompanyReviews />} />
                <Route path="/company/customers" element={<CompanyCustomers />} />
                <Route path="/company/analytics" element={<CompanyAnalytics />} />
                <Route path="/company/chat" element={<CompanyChat />} />
                <Route path="/company/details" element={<CompanyProfileSettings />} />
                <Route path="/company/settings" element={<CompanySettings />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
      </div>
    </AppProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  )
}

export default App


