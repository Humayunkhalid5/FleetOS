import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Logo from '../ui/Logo';
import ThemeToggle from '../common/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants';

const links = [
  ['/#how-it-works', 'How it works'],
  ['/company/register', 'For companies'],
  [ROUTES.about, 'About'],
  [ROUTES.contact, 'Contact'],
];

function SiteHeader() {
  const { user } = useAuth() || {};
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [openPath, setOpenPath] = useState(pathname);
  if (pathname !== openPath) { setOpenPath(pathname); setOpen(false); }
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-[background-color,border-color] duration-200 ${scrolled || open ? 'glass border-b border-line' : 'border-b border-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
        <Link to="/" aria-label="FleetOS home" className="shrink-0"><Logo size={26} /></Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
          {links.map(([to, label]) => (to.includes('#')
            ? <Link key={to} to={to} className="nav-pill">{label}</Link>
            : <NavLink key={to} to={to} className="nav-pill">{label}</NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {user?.role === 'customer' ? (
            <Link to={ROUTES.companies} className="btn btn-primary hidden sm:inline-flex">Open my portal</Link>
          ) : (
            <>
              <Link to={ROUTES.login} className="btn btn-ghost hidden sm:inline-flex">Sign in</Link>
              <Link to={ROUTES.register} className="btn btn-primary hidden sm:inline-flex">Get started</Link>
            </>
          )}
          <button type="button" className="btn btn-ghost btn-icon md:hidden" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((value) => !value)}>
            <span className="material-symbols-outlined">{open ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line px-4 pb-5 pt-3 md:hidden animate-fade-in">
          <nav className="grid gap-1" aria-label="Mobile">
            {links.map(([to, label]) => <Link key={to} to={to} className="rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-sunken">{label}</Link>)}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link to={ROUTES.login} className="btn btn-secondary">Sign in</Link>
            <Link to={ROUTES.register} className="btn btn-primary">Get started</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();
  const columns = [
    ['Product', [['/#how-it-works', 'How it works'], [ROUTES.companies, 'Find a company'], ['/company/register', 'Register a company']]],
    ['Company', [[ROUTES.about, 'About FleetOS'], [ROUTES.contact, 'Contact sales'], [ROUTES.contact, 'Support']]],
    ['Account', [[ROUTES.login, 'Sign in'], [ROUTES.register, 'Create customer account'], [ROUTES.bookings, 'My bookings']]],
  ];
  return (
    <footer className="relative z-[1] border-t border-line bg-surface/60">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo size={26} />
          <p className="mt-4 text-[13.5px] text-muted">Bookings, dispatch, stock and payments for service companies.</p>
        </div>
        {columns.map(([title, items]) => (
          <div key={title}>
            <p className="text-[13px] font-semibold text-ink">{title}</p>
            <ul className="mt-2 grid gap-0.5">
              {/* min-h keeps every footer link a comfortable tap target on
                  phones without changing the spacing rhythm. */}
              {items.map(([to, label]) => (
                <li key={label}>
                  <Link to={to} className="inline-flex min-h-[32px] items-center text-[13.5px] text-muted transition-colors hover:text-ink">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-subtle sm:px-6">
          <span>© {year} FleetOS. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}

export default function PublicLayout({ children }) {
  const { pathname, hash } = useLocation();
  const bare = ['/login', '/register', '/company/register'].includes(pathname);

  // Support /#section links from any public page.
  useEffect(() => {
    if (!hash) return;
    const id = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => window.clearTimeout(id);
  }, [hash, pathname]);

  return (
    <div className="relative min-h-dvh">
      <SiteHeader />
      <main key={pathname} className="relative z-[1] overflow-x-clip animate-fade-in">{children}</main>
      {!bare && <SiteFooter />}
    </div>
  );
}
