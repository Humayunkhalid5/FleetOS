import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { AppProvider } from './context/AppContext'

// Lazy-loaded routes for faster initial load (code splitting)
const Home = lazy(() => import('./pages/public/Home/Home'))
const Login = lazy(() => import('./pages/public/Login/Login'))
const Register = lazy(() => import('./pages/public/Register/Register'))
const About = lazy(() => import('./pages/public/About/About'))
const Contact = lazy(() => import('./pages/public/Contact/Contact'))
const CompanyRegister = lazy(() => import('./pages/public/CompanyRegister/CompanyRegister'))

// Customer pages
const CustomerDashboard = lazy(() => import('./pages/customer/Dashboard/CustomerDashboard'))
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

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="app-shell">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/company/register" element={<CompanyRegister />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />

              {/* Customer */}
              <Route path="/customer/dashboard" element={<CustomerDashboard />} />
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

              {/* Company Admin */}
              <Route path="/company/dashboard" element={<CompanyDashboard />} />
              <Route path="/company/inventory" element={<CompanyInventory />} />
              <Route path="/company/technicians" element={<CompanyTechnicians />} />
              <Route path="/company/services" element={<CompanyServices />} />
              <Route path="/company/bookings" element={<CompanyBookings />} />
              <Route path="/company/reviews" element={<CompanyReviews />} />
              <Route path="/company/customers" element={<CompanyCustomers />} />
              <Route path="/company/analytics" element={<CompanyAnalytics />} />
              <Route path="/company/chat" element={<CompanyChat />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App

