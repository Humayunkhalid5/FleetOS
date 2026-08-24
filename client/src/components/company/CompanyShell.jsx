import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

export const COMPANY_NAV = [
  ['space_dashboard', 'Overview', ROUTES.companyDashboard],
  ['handyman', 'Requests', ROUTES.companyBookings],
  ['badge', 'Staff', ROUTES.companyTechnicians],
  ['inventory_2', 'Inventory', ROUTES.companyInventory],
  ['storefront', 'Services', ROUTES.companyServices],
  ['groups', 'Customers', ROUTES.companyCustomers],
  ['forum', 'Client Messages', ROUTES.companyChat],
  ['star', 'Reviews', ROUTES.companyReviews],
  ['monitoring', 'Analytics', ROUTES.companyAnalytics],
  ['domain', 'Company Details', ROUTES.companyDetails],
  ['settings', 'Settings', ROUTES.companySettings],
];

function initials(value) {
  return String(value || 'CO').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function CompanyShell({ title, subtitle, actions, search, onSearch, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate(ROUTES.login);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 font-sans md:flex">
      <aside className="company-sidebar hidden md:flex fixed inset-y-0 left-0 w-[260px] bg-white border-r border-slate-100 flex-col z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="h-[80px] px-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="material-symbols-outlined text-white text-[18px]">domain</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">FleetOS</span>
        </div>

        <div className="company-sidebar-scroll px-5 py-3 overflow-y-auto flex-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Main Menu</p>
          <nav className="space-y-1">
            {COMPANY_NAV.map(([icon, label, to]) => {
              const active = location.pathname === to;
              return (
                <Link key={label} to={to} preventScrollReset className={`flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-200 ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                  <span className={`material-symbols-outlined text-[20px] ${active ? 'text-blue-600' : 'text-slate-400'}`} style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                {initials(user?.name || user?.companyName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Company user'}</p>
                <p className="text-[11px] font-semibold text-slate-500 truncate">{user?.companyName || 'FleetOS Company'}</p>
              </div>
            </div>
            <button onClick={signOut} className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-[13px] font-bold hover:bg-slate-100 transition-colors flex justify-center items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">logout</span> Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-[260px] min-w-0">
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
              {COMPANY_NAV.map(([icon, label, to]) => {
                const active = location.pathname === to;
                return (
                  <Link key={label} to={to} className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 bg-slate-50'}`}>
                    <span className="material-symbols-outlined text-[17px]">{icon}</span>{label}
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
