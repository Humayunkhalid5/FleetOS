import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { usePageChromeValue } from '../../hooks/usePageChrome';
import { prefetch } from '../../hooks/useLiveQuery';
import { useUnreadMessages } from '../../hooks/usePortalCounts';
import { useRealtime, useLiveEvent } from '../../hooks/useRealtime';
import { useFeedback } from '../../hooks/useFeedback';
import Logo from '../ui/Logo';
import { Avatar } from '../ui';
import ThemeToggle from '../common/ThemeToggle';
import NotificationBell from '../common/NotificationBell';
import CopilotDrawer from './CopilotDrawer';
import { DASHBOARD_KEY, useWorkspace } from './workspace';

function navigation(workspace, modules) {
  return [
    ['Operations', [
      ['space_dashboard', 'Overview', ROUTES.companyDashboard, [DASHBOARD_KEY]],
      modules.requests && ['inbox', workspace.requestLabel || 'Requests', ROUTES.companyBookings, ['/bookings', '/technicians']],
      modules.requests && ['psychology', 'Smart Dispatch', '/company/dispatch', ['/bookings', '/technicians']],
      modules.workforce && ['badge', workspace.workforceLabel || 'Staff', ROUTES.companyTechnicians, ['/technicians']],
    ]],
    ['Catalog', [
      ['storefront', workspace.offeringLabel || 'Services', ROUTES.companyServices, ['/services']],
      modules.inventory && ['inventory_2', workspace.inventoryLabel || 'Inventory', ROUTES.companyInventory, ['/inventory']],
    ]],
    ['Customers', [
      modules.customers && ['groups', 'Customers', ROUTES.companyCustomers, ['/customers']],
      modules.chat && ['forum', 'Messages', ROUTES.companyChat, ['/chats/conversations'], 'messages'],
      modules.reviews && ['star', 'Reviews', ROUTES.companyReviews, ['/reviews']],
    ]],
    ['Insights', [
      modules.analytics && ['monitoring', 'Analytics', ROUTES.companyAnalytics, [DASHBOARD_KEY]],
    ]],
  ].map(([group, items]) => [group, items.filter(Boolean)]).filter(([, items]) => items.length);
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { company, workspace, modules } = useWorkspace();
  const unread = useUnreadMessages(modules.chat);
  const { connected } = useRealtime();
  const groups = navigation(workspace, modules);
  const name = company?.name || user?.companyName || 'Company';
  const signOut = async () => { await logout(); navigate(ROUTES.login, { replace: true }); };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link to={ROUTES.companyDashboard} onClick={onNavigate} aria-label="Workspace home"><Logo size={24} /></Link>
      </div>

      <Link to={ROUTES.companyDetails} onClick={onNavigate} className="mx-3 mb-2 flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 transition-colors hover:border-line-strong">
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-soft text-[13px] font-bold text-brand-fg">
          {company?.logo || user?.companyLogo ? <img src={company?.logo || user?.companyLogo} alt="" className="h-full w-full object-cover" /> : name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-ink">{name}</span>
          <span className="flex items-center gap-1.5 truncate text-[11.5px] text-subtle">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-success' : 'bg-warning'}`} title={connected ? 'Live updates connected' : 'Reconnecting'} />
            {workspace.businessCategoryLabel || 'Company workspace'}
          </span>
        </span>
      </Link>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Workspace">
        {groups.map(([group, items]) => (
          <div key={group} className="mt-4">
            <p className="px-3 pb-1.5 text-[11.5px] font-semibold text-subtle">{group}</p>
            <ul className="grid gap-0.5">
              {items.map(([icon, label, to, keys, badge]) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onNavigate}
                    onMouseEnter={() => keys?.forEach((key) => prefetch(key))}
                    onFocus={() => keys?.forEach((key) => prefetch(key))}
                    className={({ isActive }) => `group relative flex h-9 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors ${isActive ? 'bg-brand-soft text-brand-fg' : 'text-muted hover:bg-sunken hover:text-ink'}`}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute -left-3 top-1.5 h-6 w-[3px] rounded-r-full bg-brand" />}
                        <span className={`material-symbols-outlined text-[19px] ${isActive ? 'icon-fill' : 'text-subtle group-hover:text-ink'}`}>{icon}</span>
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {badge === 'messages' && unread > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#DC2626] px-1 text-[10.5px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <NavLink to={ROUTES.companyDetails} onClick={onNavigate} onMouseEnter={() => prefetch(DASHBOARD_KEY)} className={({ isActive }) => `mb-0.5 flex h-9 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium ${isActive ? 'bg-brand-soft text-brand-fg' : 'text-muted hover:bg-sunken hover:text-ink'}`}>
          <span className="material-symbols-outlined text-[19px]">storefront</span>Business profile
        </NavLink>
        <NavLink to={ROUTES.companySettings} onClick={onNavigate} className={({ isActive }) => `flex h-9 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium ${isActive ? 'bg-brand-soft text-brand-fg' : 'text-muted hover:bg-sunken hover:text-ink'}`}>
          <span className="material-symbols-outlined text-[19px]">settings</span>Settings
        </NavLink>
        <div className="mt-2 flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user?.name} src={user?.avatar} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">{user?.name || 'Company user'}</p>
            <p className="truncate text-[11.5px] text-subtle">{user?.email}</p>
          </div>
          <button type="button" onClick={signOut} className="btn btn-ghost btn-icon btn-sm" title="Sign out" aria-label="Sign out"><span className="material-symbols-outlined">logout</span></button>
        </div>
      </div>
    </div>
  );
}

export default function CompanyLayout({ children }) {
  const { title, subtitle, actions, search, onSearch } = usePageChromeValue();
  const { user } = useAuth();
  const { company } = useWorkspace();
  const companyName = company?.name || user?.companyName || 'Company';
  const companyLogo = company?.logo || user?.companyLogo;
  const initials = companyName.split(' ').map((part) => part[0]).slice(0, 2).join('');
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [copilot, setCopilot] = useState(false);
  const { toast } = useFeedback();
  const [drawerPath, setDrawerPath] = useState(pathname);
  if (pathname !== drawerPath) { setDrawerPath(pathname); setDrawer(false); }
  // A new booking is announced wherever the team is in the workspace.
  useLiveEvent('booking:created', (payload) => {
    if (payload?.reference && !String(payload.reference).startsWith('FOS-CHAT')) toast.info(`${payload.reference} is waiting for staff assignment.`, { title: 'New booking received' });
  });
  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') { event.preventDefault(); setCopilot((value) => !value); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-line bg-canvas/70 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-[120] lg:hidden ${drawer ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-navy/40 transition-opacity dark:bg-black/60 ${drawer ? 'opacity-100' : 'opacity-0'}`} onClick={() => setDrawer(false)} />
        <aside className={`absolute inset-y-0 left-0 w-[min(280px,86vw)] border-r border-line bg-canvas shadow-pop transition-transform duration-300 ease-out ${drawer ? 'translate-x-0' : '-translate-x-full'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <SidebarContent onNavigate={() => setDrawer(false)} />
        </aside>
      </div>

      <div className="lg:pl-[248px]">
        <header className="glass sticky top-0 z-30 border-b border-line">
          <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            {/* One compact control: the company mark doubles as the drawer
                trigger, so the workspace stays identifiable while navigating
                and the header keeps room for the page title on small phones. */}
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open navigation"
              aria-expanded={drawer}
              className="-ml-2 flex h-11 shrink-0 items-center gap-1.5 rounded-xl pl-0.5 pr-1.5 transition-colors hover:bg-sunken lg:hidden"
            >
              <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-xl border border-line bg-brand-soft text-[12px] font-bold text-brand-fg">
                {companyLogo ? <img src={companyLogo} alt="" className="h-full w-full object-cover" /> : initials}
              </span>
              <span className="material-symbols-outlined text-[19px] text-subtle">expand_more</span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="line-clamp-2 text-[15.5px] font-semibold leading-5 tracking-tight text-ink sm:truncate sm:text-[18px] sm:leading-6">{title || 'Overview'}</h1>
              {subtitle && <p className="hidden truncate text-[13px] text-muted sm:block">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-1.5">
              {typeof search === 'string' && (
                <label className="input-icon hidden md:block">
                  <span className="material-symbols-outlined">search</span>
                  <input className="input input-sm w-56 xl:w-72" value={search} onChange={(event) => onSearch?.(event.target.value)} placeholder="Search this page" aria-label="Search this page" />
                </label>
              )}
              <button type="button" onClick={() => setCopilot(true)} className="btn btn-soft h-9 px-3" title="AI Copilot (Ctrl/⌘ + J)">
                <span className="material-symbols-outlined icon-fill text-[18px]">auto_awesome</span>
                <span className="hidden sm:inline">Copilot</span>
              </button>
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
          {typeof search === 'string' && (
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-4 pb-3 sm:px-6 md:hidden">
              <label className="input-icon min-w-0 flex-1">
                <span className="material-symbols-outlined">search</span>
                <input className="input input-sm" value={search} onChange={(event) => onSearch?.(event.target.value)} placeholder="Search" aria-label="Search this page" />
              </label>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {actions && <div className="page-actions mb-4 flex flex-wrap items-center justify-end gap-2 sm:mb-5">{actions}</div>}
          <div key={pathname} className="animate-rise-in">{children}</div>
        </main>
      </div>

      <CopilotDrawer isOpen={copilot} onClose={() => setCopilot(false)} />
    </div>
  );
}
