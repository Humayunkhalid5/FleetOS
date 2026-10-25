// ---------------------------------------------------------------------------
// FleetOS Client Portal — Central app constants & navigation data
// Single source of truth for routes, nav links, technicians, materials, etc.
// ---------------------------------------------------------------------------

// Route map
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  about: '/about',
  contact: '/contact',
  dashboard: '/customer/companies',
  profile: '/customer/profile',
  bookings: '/customer/bookings',
  reviews: '/customer/reviews',
  payments: '/customer/payments',
  notifications: '/customer/notifications',
  customizeBooking: '/customer/customize-booking',
  bookingSummary: '/customer/booking-summary',
  liveTracking: '/customer/live-tracking',
  serviceReview: '/customer/service-review',
  chat: '/customer/chat',
  companies: '/customer/companies',
  companyDashboard: '/company/dashboard',
  companyRegister: '/company/register',
  companyInventory: '/company/inventory',
  companyTechnicians: '/company/technicians',
  companyServices: '/company/services',
  companyBookings: '/company/bookings',
  companyReviews: '/company/reviews',
  companyCustomers: '/company/customers',
  companyAnalytics: '/company/analytics',
  companyChat: '/company/chat',
  companyDetails: '/company/details',
  companySettings: '/company/settings',
};

export const companyRoute = (id = 'pak-fleet-mobility') => `/customer/company/${id}`;

// Service categories shown on the dashboard and Companies filter
export const CATEGORIES = [
  { icon: 'storefront',           label: 'Retail Product',       value: 'retail product' },
  { icon: 'construction',         label: 'Installation',         value: 'installation' },
  { icon: 'support_agent',        label: 'Repair & Support',     value: 'repair & support' },
  { icon: 'home_repair_service',  label: 'Home Service',         value: 'home service' },
  { icon: 'business_center',      label: 'Business Service',     value: 'business service' },
  { icon: 'computer',             label: 'Digital Service',      value: 'digital service' },
  { icon: 'workspace_premium',    label: 'Professional Service', value: 'professional service' },
];
