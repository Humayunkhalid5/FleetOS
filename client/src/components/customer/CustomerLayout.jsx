import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { usePageChromeValue } from '../../hooks/usePageChrome';
import { useUnreadMessages } from '../../hooks/usePortalCounts';
import { prefetch } from '../../hooks/useLiveQuery';
import { useLiveEvent } from '../../hooks/useRealtime';
import { useFeedback } from '../../hooks/useFeedback';
import Logo from '../ui/Logo';
import { Avatar } from '../ui';
import ThemeToggle from '../common/ThemeToggle';
import NotificationBell from '../common/NotificationBell';

const NAV = [
  ['travel_explore', 'Explore', ROUTES.companies, ['/companies?page=1&limit=24']],
  ['event_note', 'Bookings', ROUTES.bookings, ['/bookings']],
  ['forum', 'Messages', ROUTES.chat, ['/chats/conversations'], 'messages'],
  ['payments', 'Payments', ROUTES.payments, ['/payments']],
  ['reviews', 'Reviews', ROUTES.reviews, ['/reviews']],
];

function ProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  const [openPath, setOpenPath] = useState(pathname);
  if (pathname !== openPath) { setOpenPath(pathname); setOpen(false); }
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const signOut = async () => { await logout(); navigate(ROUTES.login, { replace: true }); };
  const items = [
    ['person', 'Profile & settings', ROUTES.profile],
    ['event_note', 'My bookings', ROUTES.bookings],
    ['payments', 'Payments', ROUTES.payments],
    ['notifications', 'Notifications', ROUTES.notifications],
  ];

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Account menu" className="flex items-center gap-2 rounded-full p-0.5 pr-1 transition-colors hover:bg-sunken">
        <Avatar name={user?.name} src={user?.avatar} size={34} />
        <span className="material-symbols-outlined hidden text-[18px] text-subtle sm:inline-block">expand_more</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[60] w-64 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-line bg-raised shadow-pop">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Avatar name={user?.name} src={user?.avatar} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{user?.name || 'Customer'}</p>
              <p className="truncate text-[12px] text-subtle">{user?.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            {items.map(([icon, label, to]) => (
              <Link key={label} to={to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-ink hover:bg-sunken">
                <span className="material-symbols-outlined text-[19px] text-subtle">{icon}</span>{label}
              </Link>
            ))}
            <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-danger-fg hover:bg-danger-soft">
              <span className="material-symbols-outlined text-[19px]">logout</span>Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CountBadge({ count }) {
  if (!count) return null;
  return <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#DC2626] px-1 text-[10.5px] font-bold text-white">{count > 9 ? '9+' : count}</span>;
}

export default function CustomerLayout({ children }) {
  const { title, subtitle, actions, backTo, showBack } = usePageChromeValue();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const unread = useUnreadMessages();
  const { toast } = useFeedback();
  // Status changes are announced unless the customer is already watching the job.
  useLiveEvent('booking:updated', (payload) => {
    if (!payload?.status || pathname.startsWith(ROUTES.liveTracking) || String(payload.reference || '').startsWith('FOS-CHAT')) return;
    toast.info(`${payload.reference} is now ${payload.status}.`, { title: 'Booking update' });
  });
  const isTopLevel = NAV.some(([, , to]) => pathname === to);

  return (
    <div className="min-h-dvh pb-20 lg:pb-0">
      <header className="glass sticky top-0 z-50 border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 sm:px-6">
          <Link to={ROUTES.companies} aria-label="FleetOS home" className="shrink-0"><Logo size={26} /></Link>
          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Customer">
            {NAV.map(([icon, label, to, keys, badge]) => (
              <NavLink key={to} to={to} onMouseEnter={() => keys.forEach((key) => prefetch(key))} onFocus={() => keys.forEach((key) => prefetch(key))} className={({ isActive }) => `nav-pill gap-2 ${isActive ? 'active' : ''}`}>
                <span className="material-symbols-outlined text-[18px]">{icon}</span>{label}
                {badge === 'messages' && <CountBadge count={unread} />}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell allHref={ROUTES.notifications} />
            <ThemeToggle />
            <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
            <ProfileMenu />
          </div>
        </div>
      </header>

      {(title || actions) && (
        <div className="mx-auto max-w-[1280px] px-4 pt-5 sm:px-6 sm:pt-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              {showBack !== false && !isTopLevel && (
                <button type="button" onClick={() => (backTo ? navigate(backTo) : window.history.length > 1 ? navigate(-1) : navigate(ROUTES.companies))} className="btn btn-secondary btn-icon mt-0.5 shrink-0" aria-label="Go back">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
              )}
              <div className="min-w-0">
                <h1 className="page-title truncate">{title}</h1>
                {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="page-actions flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}

      <main key={pathname} className="mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-6 sm:pt-6 animate-rise-in">{children}</main>

      {/* Mobile tab bar */}
      <nav className="glass fixed inset-x-0 bottom-0 z-50 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Customer mobile">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map(([icon, label, to, , badge]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-brand-fg' : 'text-subtle'}`}>
              {({ isActive }) => (
                <>
                  <span className={`material-symbols-outlined text-[22px] ${isActive ? 'icon-fill' : ''}`}>{icon}</span>
                  {label}
                  {badge === 'messages' && unread > 0 && <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-danger" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
