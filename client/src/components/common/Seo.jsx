import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Keeps the document head in sync with the active route.
 *
 * The public pages are the ones search engines index, so each one carries its
 * own title, description and canonical URL. Everything behind a sign-in
 * (`/customer/*`, the company workspace) is marked `noindex` — those screens
 * show private data and should never appear in a result page.
 *
 * Canonicals are built from `window.location.origin` at runtime, so a correct
 * URL is produced on localhost, on a preview domain and in production without
 * hard-coding a hostname.
 */

const DESCRIPTION = 'FleetOS is the booking and operations platform for local service businesses. Customers book verified companies and track jobs live; companies handle requests, staff, stock and payments in one workspace.';

const PUBLIC_PAGES = {
  '/': {
    title: 'FleetOS — Book local services and run every job in one workspace',
    description: DESCRIPTION,
  },
  '/about': {
    title: 'About FleetOS — Service operations from request to receipt',
    description: 'FleetOS connects customers with verified local service companies and gives those companies one workspace for requests, staff, stock and payments.',
  },
  '/contact': {
    title: 'Contact FleetOS — Sales, support and company onboarding',
    description: 'Talk to the FleetOS team about onboarding your company, moving your operations across, or getting help with an active workspace.',
  },
  '/company/register': {
    title: 'Register your company on FleetOS — Get discovered and take bookings',
    description: 'List your service business on FleetOS. Upload your documents once, get approved, and start receiving booking requests, dispatching staff and recording payments.',
  },
  '/login': {
    title: 'Sign in · FleetOS',
    description: 'Sign in to FleetOS. Customers and company teams use the same sign-in and land in the right workspace automatically.',
  },
  '/register': {
    title: 'Create your FleetOS account',
    description: 'Create a FleetOS account to book verified local service companies, follow jobs live and keep every invoice in one place.',
  },
};

const PRIVATE_ROUTE_TITLES = [
  ['/customer/companies', 'Explore companies · FleetOS'],
  ['/customer/company/', 'Company profile · FleetOS'],
  ['/customer/bookings', 'My bookings · FleetOS'],
  ['/customer/live-tracking', 'Live tracking · FleetOS'],
  ['/customer/messages', 'Messages · FleetOS'],
  ['/customer/chat', 'Messages · FleetOS'],
  ['/customer/payments', 'Payments · FleetOS'],
  ['/customer/reviews', 'Reviews · FleetOS'],
  ['/customer/profile', 'Profile and settings · FleetOS'],
  ['/customer/notifications', 'Notifications · FleetOS'],
  ['/company/dashboard', 'Overview · FleetOS workspace'],
  ['/company/bookings', 'Requests · FleetOS workspace'],
  ['/company/dispatch', 'Smart dispatch · FleetOS workspace'],
  ['/company/technicians', 'Staff · FleetOS workspace'],
  ['/company/services', 'Services · FleetOS workspace'],
  ['/company/inventory', 'Inventory · FleetOS workspace'],
  ['/company/customers', 'Customers · FleetOS workspace'],
  ['/company/chat', 'Messages · FleetOS workspace'],
  ['/company/reviews', 'Reviews · FleetOS workspace'],
  ['/company/analytics', 'Analytics · FleetOS workspace'],
  ['/company/details', 'Business profile · FleetOS workspace'],
  ['/company/settings', 'Settings · FleetOS workspace'],
];

const isPrivate = (pathname) => !Object.hasOwn(PUBLIC_PAGES, pathname)
  && (pathname.startsWith('/customer') || pathname.startsWith('/company'));

function privateTitle(pathname) {
  const match = PRIVATE_ROUTE_TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : 'FleetOS workspace';
}

function upsertMeta(attribute, key, content) {
  if (!content) return;
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = PUBLIC_PAGES[pathname];
    const privateRoute = isPrivate(pathname);
    const title = page?.title || (privateRoute ? privateTitle(pathname) : 'FleetOS');
    const description = page?.description || (privateRoute ? 'Private FleetOS workspace.' : DESCRIPTION);
    const origin = window.location.origin;
    const canonical = `${origin}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', privateRoute ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertLink('canonical', canonical);
  }, [pathname]);

  return null;
}
