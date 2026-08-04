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
  dashboard: '/customer/dashboard',
  profile: '/customer/profile',
  bookings: '/customer/bookings',
  reviews: '/customer/reviews',
  customizeBooking: '/customer/customize-booking',
  bookingSummary: '/customer/booking-summary',
  liveTracking: '/customer/live-tracking',
  serviceReview: '/customer/service-review',
  chat: '/customer/chat',
  companies: '/customer/companies',
};

export const companyRoute = (id = 'swiftfleet') => `/customer/company/${id}`;

// Sidebar navigation links (desktop drawer)
export const SIDEBAR_LINKS = [
  { label: 'Dashboard', icon: 'dashboard', to: ROUTES.dashboard },
  { label: 'Browse Services', icon: 'category', to: ROUTES.customizeBooking },
  { label: 'Browse Companies', icon: 'business', to: ROUTES.companies },
  { label: 'My Bookings', icon: 'calendar_today', to: ROUTES.bookings },
  { label: 'Payments', icon: 'payments', to: ROUTES.bookings },
  { label: 'Reviews', icon: 'rate_review', to: ROUTES.reviews },
  { label: 'Notifications', icon: 'notifications', to: ROUTES.bookings },
];

export const SIDEBAR_FOOTER_LINKS = [
  { label: 'Profile', icon: 'account_circle', to: ROUTES.profile },
];

// Mobile bottom navigation
export const BOTTOM_NAV = [
  { label: 'Dashboard', icon: 'dashboard', to: ROUTES.dashboard },
  { label: 'Bookings', icon: 'event_note', to: ROUTES.bookings },
  { label: 'Search', icon: 'search', to: ROUTES.bookings },
  { label: 'Profile', icon: 'person', to: ROUTES.profile },
];

// Service categories shown on the dashboard
export const CATEGORIES = [
  { icon: 'plumbing', label: 'Plumbing' },
  { icon: 'electrical_services', label: 'Electrical' },
  { icon: 'cleaning_services', label: 'Cleaning' },
  { icon: 'hvac', label: 'HVAC' },
  { icon: 'pest_control', label: 'Pests' },
];

// Technicians for the booking flow (Customize Booking)
export const TECHNICIANS = [
  {
    name: 'Marcus Chen',
    role: 'HVAC Specialist',
    rating: 4.9,
    exp: '5 Years Exp.',
    tag: 'Available Today',
    tagClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD5AyVNVgU3fMKYE-w9lt2vv-p6eVQZIfg6Dptpx8JCaL4-6nGgTDHa_mj5-AzmY-uLMkGNTIrWAAerynADtJ0GHObDXf-Uvz2QwEZmKhyEfAT_nSugmPIYwE2PzjauysFb8q2M7FkZBzAsEoni28SOUIcacSdkVYpoGZSXujS0CoJH6dA1CzgzKSoZifnern2RmB6DcTx8hafQaxycXpqYrW7wzIfoLmmMKFf5mF_Dfl-KBvh47o2jsg',
  },
  {
    name: 'Elena Rodriguez',
    role: 'Master Electrician',
    rating: 5.0,
    exp: '8 Years Exp.',
    tag: 'Highly Rated',
    tagClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCiWvnkOKQReJfbwVPnaN6tu7s5397gTYSVBPMyiX6toCf8p5wo3eRuZ2QIc2TqcZrm-1vI7JyRT7oqpSWXpAdRECBDCnRGuLQM6zGzCDYi5wegUEzJG2p7E7E7jfdx9hSCUUoveU458OaY-di3G4frMSjmTJwjSznLPYXVl_zY_nMTuD0q3drMrje1gMak8VTFXTBe687naWHZTIHqBAHuyZqtzAN7B6ZysOa9vPYFnRqmNuHtlY1A',
  },
  {
    name: 'Jordan Smith',
    role: 'Plumbing Lead',
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
  { id: 'faucet', name: 'Standard Faucet', price: 45.0 },
  { id: 'pipe', name: 'Copper Pipe (10ft)', price: 22.5 },
  { id: 'valve', name: 'Shut-off Valve', price: 12.0 },
  { id: 'trap', name: 'P-Trap Kit', price: 18.99 },
];

export const BASE_LABOR = 120.0;

// Demo data for the Bookings page
export const DEMO_BOOKINGS = [
  {
    id: '#FOS-88219',
    service: 'HVAC Maintenance',
    icon: 'engineering',
    date: 'Oct 24, 2:00 PM',
    status: 'In Progress',
    statusClass: 'bg-tertiary-container text-on-tertiary-container',
    tech: 'Marcus',
    techAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAXseizkm1YjckE5n5VxMg5CggM5tWpEmFJb6Nh_K_YkNVo40p1Yevl-WlnGuO8GzMdJdrZp8kdZQb3ZDcSxuiV_2ErTyIeVqyaBZK-nPif46TJoCq9h4YdIwBUC1OjbIolw7sUTycfKf2D-oq4uWEU-n3Qx9eOOnhne-zMLa8az8kS0otxEJrSek7ktvcO59SSzqHzjWUd-fz9XEi8CWxSgfLV1vViyFHYFZv0pnbOlb8gtEzax7skMQ',
  },
  {
    id: '#FOS-88102',
    service: 'Engine Diagnostics',
    icon: 'build',
    date: 'Oct 19, 9:30 AM',
    status: 'Completed',
    statusClass: 'bg-secondary-container text-on-secondary-container',
    tech: 'Elena',
    techAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCiWvnkOKQReJfbwVPnaN6tu7s5397gTYSVBPMyiX6toCf8p5wo3eRuZ2QIc2TqcZrm-1vI7JyRT7oqpSWXpAdRECBDCnRGuLQM6zGzCDYi5wegUEzJG2p7E7E7jfdx9hSCUUoveU458OaY-di3G4frMSjmTJwjSznLPYXVl_zY_nMTuD0q3drMrje1gMak8VTFXTBe687naWHZTIHqBAHuyZqtzAN7B6ZysOa9vPYFnRqmNuHtlY1A',
  },
];

// Demo data for the Reviews page
export const DEMO_REVIEWS = [
  {
    id: 1,
    service: 'Mobile Oil Change',
    tech: 'Marcus Vance',
    rating: 5,
    date: 'Oct 12, 2023',
    comment: 'Fast, clean and professional. Highly recommend.',
  },
  {
    id: 2,
    service: 'AC Maintenance',
    tech: 'Marcus Chen',
    rating: 4,
    date: 'Sep 28, 2023',
    comment: 'Great service, arrived on time and fixed the issue.',
  },
];
