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

// Sidebar navigation links (desktop drawer)
export const SIDEBAR_LINKS = [
  { label: 'Home',            icon: 'home',             to: ROUTES.home },
  { label: 'Browse Services', icon: 'category',          to: ROUTES.companies },
  { label: 'Browse Companies',icon: 'business',          to: ROUTES.companies },
  { label: 'My Bookings',     icon: 'calendar_today',    to: ROUTES.bookings },
  { label: 'Messages',        icon: 'forum',             to: ROUTES.chat, badge: 'messages' },
  { label: 'Payments',        icon: 'payments',          to: ROUTES.payments },
  { label: 'Reviews',         icon: 'rate_review',       to: ROUTES.reviews },
  { label: 'Notifications',   icon: 'notifications',     to: ROUTES.notifications },
];

export const SIDEBAR_FOOTER_LINKS = [
  { label: 'Profile', icon: 'account_circle', to: ROUTES.profile },
];

// Mobile bottom navigation
export const BOTTOM_NAV = [
  { label: 'Home',       icon: 'home',       to: ROUTES.home },
  { label: 'Bookings',   icon: 'event_note', to: ROUTES.bookings },
  { label: 'Companies',  icon: 'business',   to: ROUTES.companies },
  { label: 'Profile',    icon: 'person',     to: ROUTES.profile },
];

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

// Technicians for the booking flow (Customize Booking)
export const TECHNICIANS = [
  {
    name: 'Imran Ali',
    role: 'Fleet HVAC Specialist',
    rating: 4.9,
    exp: '5 Years Exp.',
    tag: 'Available Today',
    tagClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD5AyVNVgU3fMKYE-w9lt2vv-p6eVQZIfg6Dptpx8JCaL4-6nGgTDHa_mj5-AzmY-uLMkGNTIrWAAerynADtJ0GHObDXf-Uvz2QwEZmKhyEfAT_nSugmPIYwE2PzjauysFb8q2M7FkZBzAsEoni28SOUIcacSdkVYpoGZSXujS0CoJH6dA1CzgzKSoZifnern2RmB6DcTx8hafQaxycXpqYrW7wzIfoLmmMKFf5mF_Dfl-KBvh47o2jsg',
  },
  {
    name: 'Ayesha Khan',
    role: 'Master Electrician',
    rating: 5.0,
    exp: '8 Years Exp.',
    tag: 'Highly Rated',
    tagClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCiWvnkOKQReJfbwVPnaN6tu7s5397gTYSVBPMyiX6toCf8p5wo3eRuZ2QIc2TqcZrm-1vI7JyRT7oqpSWXpAdRECBDCnRGuLQM6zGzCDYi5wegUEzJG2p7E7E7jfdx9hSCUUoveU458OaY-di3G4frMSjmTJwjSznLPYXVl_zY_nMTuD0q3drMrje1gMak8VTFXTBe687naWHZTIHqBAHuyZqtzAN7B6ZysOa9vPYFnRqmNuHtlY1A',
  },
  {
    name: 'Bilal Ahmed',
    role: 'Mechanical Lead',
    rating: 4.7,
    exp: '12 Years Exp.',
    tag: 'Next Available: 2 PM',
    tagClass: 'bg-surface-variant text-on-surface-variant',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBdSq9kds-9hvrnwo749V1I2EinNun7_8MX5BIE5-IMKUNAe4eYNSZlRYfJsQoPN6Bhr_Si7Oj9uq3XH8CcF0q8t2BSjIFBI_5A248PGaEjKqs1N1rbNOcqGh-pFfZ5qZmC7dv0k7AJ0lOUJGzjeGN4P8Z_QnnObTriizg6iqp9D11hzs6aSOcdIpfpF8Q04gH3UJwNaz_BNK0OIH9K1hLW_V9CsATPDG8NQAVE-f5Eg0eDZhdoGe4WAg',
  },
];

// Bookable materials
export const MATERIALS = [
  { id: 'faucet', name: 'Premium Oil Filter', price: 1800 },
  { id: 'pipe',   name: 'Engine Oil (4L)',     price: 6200 },
  { id: 'valve',  name: 'Brake Fluid',         price: 1400 },
  { id: 'trap',   name: 'Air Filter',          price: 2300 },
];

export const BASE_LABOR = 4500;

