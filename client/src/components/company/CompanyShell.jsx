import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ROUTES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import api, { getActiveSessionToken } from '../../services/api';
import { io } from 'socket.io-client';
import fleetosLogo from '../../assets/fleetos-light.svg';

export const COMPANY_NAV = [
  ['space_dashboard', 'Overview', ROUTES.companyDashboard],
  ['handyman', 'Requests', ROUTES.companyBookings],
  ['badge', 'Staff', ROUTES.companyTechnicians],
  ['inventory_2', 'Inventory', ROUTES.companyInventory],
  ['storefront', 'Services', ROUTES.companyServices],
  ['groups', 'Customers', ROUTES.companyCustomers],
  ['forum', 'Messages', ROUTES.companyChat, 'messages'],
  ['star', 'Reviews', ROUTES.companyReviews],
  ['monitoring', 'Analytics', ROUTES.companyAnalytics],
  ['domain', 'Company Profile', ROUTES.companyDetails],
  ['settings', 'Settings', ROUTES.companySettings],
];

function initials(value) {
  return String(value || 'CO').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function CompanyShell({ title, subtitle, actions, search, onSearch, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [messageCount, setMessageCount] = useState(0);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get('/chats/conversations', { noCache: true }),
      api.get('/company/dashboard', { noCache: true }),
    ]).then(([chatResult, dashboardResult]) => {
        if (!mounted) return;
        if (chatResult.status === 'fulfilled') setMessageCount((chatResult.value.conversations || []).reduce((sum, item) => sum + Number(item.unreadCount || 0), 0));
        if (dashboardResult.status === 'fulfilled') setCompany(dashboardResult.value.company || null);
      });
    return () => { mounted = false; };
  }, [location.pathname]);

  useEffect(() => {
    const refreshUnreadCount = async () => {
      try {
        const result = await api.get('/chats/conversations', { noCache: true });
        setMessageCount((result.conversations || []).reduce((sum, item) => sum + Number(item.unreadCount || 0), 0));
      } catch {
        // Navigation stays usable if a transient live connection fails.
      }
    };
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      auth: { token: getActiveSessionToken() },
      transports: ['websocket', 'polling'],
    });
    socket.on('chat:message', refreshUnreadCount);
    return () => socket.disconnect();
  }, []);

  const signOut = () => {
    logout();
    navigate(ROUTES.login);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 font-sans md:flex">
      <aside className="company-sidebar hidden md:flex fixed inset-y-0 left-0 w-[236px] bg-white border-r border-slate-100 flex-col z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <button onClick={() => navigate(ROUTES.companyDetails)} className="company-brand h-[88px] px-6 flex items-center text-left hover:bg-slate-50 transition-colors">
          <img src={fleetosLogo} alt="FleetOS" />
        </button>

        <div className="company-sidebar-scroll px-5 py-3 overflow-y-auto flex-1">
          <div className="company-context mb-5">
            <div className="company-context-logo">
              {company?.logo ? <img src={company.logo} alt={company.name || 'Company logo'} className="w-full h-full object-cover" /> : initials(company?.name || user?.companyName)}
            </div>
            <div className="min-w-0"><b>{company?.name || user?.companyName || 'Company Portal'}</b><span>Company workspace</span></div>
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Workspace</p>
          <nav className="space-y-1">
            {COMPANY_NAV.map(([icon, label, to, badge]) => {
              const active = location.pathname === to;
              return (
                <Link key={label} to={to} preventScrollReset className={`flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-200 ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                  <span className={`material-symbols-outlined text-[20px] ${active ? 'text-blue-600' : 'text-slate-400'}`} style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {badge === 'messages' && messageCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-black grid place-items-center">
                      {messageCount > 9 ? '9+' : messageCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="company-account-card rounded-2xl p-4 border border-white/10 bg-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center font-bold overflow-hidden shrink-0">
                {company?.logo ? <img src={company.logo} alt={company.name || 'Company'} className="w-full h-full object-cover" /> : initials(company?.name || user?.companyName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.name || 'Company user'}</p>
                <p className="text-[11px] font-semibold text-white/60 truncate">{company?.name || user?.companyName || 'Company account'}</p>
              </div>
            </div>
            <button onClick={() => navigate(ROUTES.companyDetails)} className="company-profile-action w-full mb-2 py-2.5 rounded-xl bg-white text-[#0D1B2A] text-[13px] font-black hover:bg-[#E0E1DD] transition-colors flex justify-center items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">edit</span> Edit Profile
            </button>
            <button onClick={signOut} className="w-full py-2.5 rounded-xl bg-transparent border border-white/15 text-white/75 text-[13px] font-bold hover:bg-white/10 transition-colors flex justify-center items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">logout</span> Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-[236px] min-w-0">
        <header className="min-h-[80px] px-5 md:px-8 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between sticky top-0 z-40 bg-[#f4f7fb]/85 backdrop-blur-xl border-b border-white/60">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 font-medium mt-1">{subtitle}</p>}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {typeof search === 'string' && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full h-11 px-4 w-full sm:w-72 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <span className="material-symbols-outlined text-slate-400 text-lg">search</span>
                <input value={search} onChange={(event) => onSearch?.(event.target.value)} className="bg-transparent border-0 outline-none text-sm w-full font-medium placeholder-slate-400" placeholder="Search..." />
              </div>
            )}
            {actions}
          </div>
        </header>

        <div className="p-5 md:p-8 max-w-[1600px] mx-auto">
          <div className="md:hidden mb-5 bg-white border border-slate-200 rounded-3xl p-3 overflow-x-auto shadow-sm">
            <div className="flex gap-2 min-w-max">
              {COMPANY_NAV.map(([icon, label, to, badge]) => {
                const active = location.pathname === to;
                return (
                  <Link key={label} to={to} className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 bg-slate-50'}`}>
                    <span className="material-symbols-outlined text-[17px]">{icon}</span>{label}
                    {badge === 'messages' && messageCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black grid place-items-center">{messageCount > 9 ? '9+' : messageCount}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export default CompanyShell;
