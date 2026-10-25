import { lazy } from 'react';

// Lazy pages that can also be preloaded. Every page chunk for the active
// portal is fetched in the background right after the first screen renders,
// so later navigation never waits on the network for code.
// After a new deploy an open tab may ask for a chunk that no longer exists.
// Reload once to pick up the new build instead of showing a blank screen.
function withReload(factory) {
  return () => factory().then((module) => {
    try { sessionStorage.removeItem('fleetos-chunk-reload'); } catch { /* storage unavailable */ }
    return module;
  }).catch((error) => {
    let reloaded = false;
    try { reloaded = sessionStorage.getItem('fleetos-chunk-reload') === '1'; sessionStorage.setItem('fleetos-chunk-reload', '1'); } catch { /* storage unavailable */ }
    if (!reloaded) { window.location.reload(); return new Promise(() => {}); }
    throw error;
  });
}

function page(loader) {
  const Component = lazy(withReload(loader));
  // Background warm-up only; a failed preload is retried when the page opens.
  Component.preload = () => loader().catch(() => {});
  return Component;
}

export const Public = {
  Home: page(() => import('./pages/public/Home/Home')),
  Login: page(() => import('./pages/public/Login/Login')),
  Register: page(() => import('./pages/public/Register/Register')),
  About: page(() => import('./pages/public/About/About')),
  Contact: page(() => import('./pages/public/Contact/Contact')),
  CompanyRegister: page(() => import('./pages/public/CompanyRegister/CompanyRegister')),
};

export const Customer = {
  Companies: page(() => import('./pages/customer/Companies/Companies')),
  CompanyDetails: page(() => import('./pages/customer/CompanyDetails/CompanyDetails')),
  CustomizeBooking: page(() => import('./pages/customer/Booking/CustomizeBooking')),
  BookingSummary: page(() => import('./pages/customer/Booking/BookingSummary')),
  LiveTracking: page(() => import('./pages/customer/Booking/LiveTracking')),
  ServiceReview: page(() => import('./pages/customer/Booking/ServiceReview')),
  Profile: page(() => import('./pages/customer/Profile/Profile')),
  Bookings: page(() => import('./pages/customer/Bookings/Bookings')),
  Reviews: page(() => import('./pages/customer/Reviews/Reviews')),
  Chat: page(() => import('./pages/customer/Chat/Chat')),
  Payments: page(() => import('./pages/customer/Payments/Payments')),
  Notifications: page(() => import('./pages/customer/Notifications/Notifications')),
};

export const Company = {
  Dashboard: page(() => import('./pages/company/Dashboard/CompanyDashboard')),
  Dispatch: page(() => import('./pages/company/Dispatch/CompanyDispatch')),
  Inventory: page(() => import('./pages/company/Inventory/CompanyInventory')),
  Technicians: page(() => import('./pages/company/Technicians/CompanyTechnicians')),
  Services: page(() => import('./pages/company/Services/CompanyServices')),
  Bookings: page(() => import('./pages/company/Bookings/CompanyBookings')),
  Reviews: page(() => import('./pages/company/Reviews/CompanyReviews')),
  Customers: page(() => import('./pages/company/Customers/CompanyCustomers')),
  Analytics: page(() => import('./pages/company/Analytics/CompanyAnalytics')),
  Chat: page(() => import('./pages/company/Chat/CompanyChat')),
  Settings: page(() => import('./pages/company/Settings/CompanySettings')),
  Profile: page(() => import('./pages/company/Details/CompanyDetails')),
};

export function preloadGroup(group) {
  const run = () => Object.values(group).forEach((Component) => Component.preload?.().catch(() => {}));
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2500 });
  else window.setTimeout(run, 600);
}
