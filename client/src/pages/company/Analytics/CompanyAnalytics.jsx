import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function CompanyAnalytics() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const companyId = user?.companyId || user?._id || 'company-1';

  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.get(`/bookings?companyId=${companyId}`);
        if (data && Array.isArray(data.bookings)) {
          setBookings(data.bookings);
        }
      } catch (err) {}
    }
    loadData();
  }, [companyId]);

  const totalJobs = bookings.length;
  const completedJobs = bookings.filter(b => b.status === 'Completed' || b.status === 'COMPLETED').length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.pricing?.finalTotal || 0), 0);

  return (
    <div className="bg-background text-on-background min-h-screen font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-full w-[280px] fixed left-0 top-0 bg-primary-container text-on-primary shadow-md py-6 z-50">
        <div className="px-6 mb-6">
          <span className="text-xl font-bold text-on-primary">FleetOS</span>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-white/20">
              <img className="w-full h-full object-cover" alt="Avatar" src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDob1EAfuIbOEB4mJ8aEtGMOAqZ2pFY3XlqCk2JkHoW67b-ZOBUc5zFlRYqQ2BZ3DG67ncjfW2OLoo5hg7xuxYuAqd8Dnt5ilPQQXVTUmumtWf50x262r2EhICAmE-N5bwuBjLhajhwN27J-KOxykfXlTI8WYp4DU3gYg4J6dBnKMvJL7SnjiVZ4DXESV3KRM6gWcKX9-Ly_MH0qvOPlsnmmbJxlvGssOUoAAS512hpEREvE9kMnIHJ0g"} />
            </div>
            <div>
              <p className="text-xs font-bold text-on-primary">{user?.name || 'Fleet Manager'}</p>
              <p className="text-xs text-on-primary-container opacity-80">{user?.companyName || 'Admin Console'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-grow space-y-1 overflow-y-auto">
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyDashboard}>
            <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
            <span className="text-xs font-bold">Dashboard</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyBookings}>
            <span className="material-symbols-outlined" data-icon="calendar_today">calendar_today</span>
            <span className="text-xs font-bold">Bookings</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyTechnicians}>
            <span className="material-symbols-outlined" data-icon="badge">badge</span>
            <span className="text-xs font-bold">Technicians</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyInventory}>
            <span className="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
            <span className="text-xs font-bold">Inventory</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyServices}>
            <span className="material-symbols-outlined" data-icon="build">build</span>
            <span className="text-xs font-bold">Services</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyCustomers}>
            <span className="material-symbols-outlined" data-icon="group">group</span>
            <span className="text-xs font-bold">Customers</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyChat}>
            <span className="material-symbols-outlined" data-icon="chat">chat</span>
            <span className="text-xs font-bold">Client Messages</span>
          </Link>
          <Link className="flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all" to={ROUTES.companyReviews}>
            <span className="material-symbols-outlined" data-icon="rate_review">rate_review</span>
            <span className="text-xs font-bold">Reviews</span>
          </Link>
          <Link className="flex items-center gap-3 bg-secondary-container text-on-secondary-container border-l-4 border-secondary px-6 py-3 transition-all" to={ROUTES.companyAnalytics}>
            <span className="material-symbols-outlined" data-icon="analytics">analytics</span>
            <span className="text-xs font-bold">Analytics</span>
          </Link>
        </nav>

        <div className="px-6 mt-auto pt-4 space-y-1">
          <button onClick={() => { logout(); navigate(ROUTES.login); }} className="w-full flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all text-left">
            <span className="material-symbols-outlined" data-icon="logout">logout</span>
            <span className="text-xs font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-[280px] flex-grow min-h-screen">
        <header className="sticky top-0 z-40 flex justify-between items-center w-full px-4 md:px-8 h-16 bg-background border-b border-outline-variant">
          <h1 className="text-lg font-bold text-primary">Fleet Analytics & Intelligence</h1>
        </header>

        <div className="p-4 md:p-8 max-w-[1440px] mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Logged Revenue</p>
              <p className="text-3xl font-bold text-slate-900">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              <span className="text-slate-500 text-xs font-bold">From completed and active jobs</span>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Fulfillment Rate</p>
              <p className="text-3xl font-bold text-slate-900">{totalJobs > 0 ? `${((completedJobs / totalJobs) * 100).toFixed(1)}%` : '0%'}</p>
              <span className="text-slate-500 text-xs font-bold">{completedJobs} of {totalJobs} jobs finished</span>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Active Dispatch Jobs</p>
              <p className="text-3xl font-bold text-slate-900">{totalJobs - completedJobs}</p>
              <span className="text-slate-500 text-xs font-bold">Pending or in-progress</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Performance Summary</h3>
            {totalJobs > 0 ? (
              <p className="text-xs text-slate-600">Your portal is actively processing service orders and technician telemetry.</p>
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <span className="material-symbols-outlined text-4xl text-slate-300">analytics</span>
                <h4 className="text-sm font-bold text-slate-800">No Performance Telemetry Yet</h4>
                <p className="text-xs text-slate-500">As your company records bookings, dispatches staff, and completes orders, performance analytics will populate automatically.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default CompanyAnalytics;
