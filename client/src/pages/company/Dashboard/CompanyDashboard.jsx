import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function CompanyDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [chartPeriod, setChartPeriod] = useState('Week');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSegmentationModal, setShowSegmentationModal] = useState(false);

  const companyId = user?.companyId || user?._id || 'company-1';

  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem(`fleetos-bookings-${companyId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const data = await api.get(`/bookings?companyId=${companyId}`);
        if (data && Array.isArray(data.bookings)) {
          const mapped = data.bookings.map(b => ({
            id: b._id ? `#FL-${b._id.slice(-4).toUpperCase()}` : (b.reference || `#FL-${Math.floor(1000 + Math.random()*9000)}`),
            tech: b.technician || 'Unassigned',
            service: b.service?.name || b.service || 'General Service',
            status: (b.status || 'PENDING').toUpperCase(),
            statusColor: (b.status === 'Completed' || b.status === 'COMPLETED') ? 'bg-tertiary-fixed-dim/20 text-on-tertiary-container' :
                         (b.status === 'In Progress' || b.status === 'IN PROGRESS') ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container',
            revenue: b.pricing?.finalTotal ? `$${b.pricing.finalTotal.toFixed(2)}` : (b.amount || '$150.00'),
            rawTotal: b.pricing?.finalTotal || 150
          }));
          setBookings(mapped);
        }
      } catch (err) {}
    }
    loadDashboardData();
  }, [companyId]);

  const totalBookingsCount = bookings.length;
  const pendingCount = bookings.filter(b => b.status === 'PENDING').length;
  const completedCount = bookings.filter(b => b.status === 'COMPLETED').length;
  const totalRevenueVal = bookings.reduce((sum, b) => sum + (b.rawTotal || 0), 0);

  const activeJobs = bookings.slice(0, 5);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.login);
  };

  const handleExportReport = () => {
    const csvData = [
      ['Asset ID', 'Technician', 'Service', 'Status', 'Revenue'],
      ...activeJobs.map(job => [job.id, job.tech, job.service, job.status, job.revenue])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FleetOS_Company_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-sans flex flex-col md:flex-row">
      {/* Navigation Drawer (Desktop) */}
      <aside className="hidden md:flex flex-col h-full w-[280px] fixed left-0 top-0 bg-primary-container text-on-primary shadow-md py-6 z-50">
        <div className="px-6 mb-6">
          <span className="text-xl font-bold text-on-primary">FleetOS</span>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-white/20">
              <img 
                className="w-full h-full object-cover" 
                alt="Fleet manager avatar" 
                src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDob1EAfuIbOEB4mJ8aEtGMOAqZ2pFY3XlqCk2JkHoW67b-ZOBUc5zFlRYqQ2BZ3DG67ncjfW2OLoo5hg7xuxYuAqd8Dnt5ilPQQXVTUmumtWf50x262r2EhICAmE-N5bwuBjLhajhwN27J-KOxykfXlTI8WYp4DU3gYg4J6dBnKMvJL7SnjiVZ4DXESV3KRM6gWcKX9-Ly_MH0qvOPlsnmmbJxlvGssOUoAAS512hpEREvE9kMnIHJ0g"} 
              />
            </div>
            <div>
              <p className="text-xs font-bold text-on-primary">{user?.name || 'Fleet Manager'}</p>
              <p className="text-xs text-on-primary-container opacity-80">{user?.companyName || 'Admin Console'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-grow space-y-1 overflow-y-auto">
          <Link className="flex items-center gap-3 bg-secondary-container text-on-secondary-container border-l-4 border-secondary px-6 py-3 transition-all" to={ROUTES.companyDashboard}>
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
        </nav>

        <div className="px-6 mt-auto pt-4 space-y-1">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all text-left"
          >
            <span className="material-symbols-outlined" data-icon="logout">logout</span>
            <span className="text-xs font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="md:ml-[280px] flex-grow min-h-screen transition-all duration-300">
        {/* Top App Bar */}
        <header className="sticky top-0 z-40 flex justify-between items-center w-full px-4 md:px-8 h-16 bg-background border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-primary">FleetOS Console</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-surface-container px-3 py-1 rounded-full border border-outline-variant">
              <span className="material-symbols-outlined text-outline text-sm" data-icon="search">search</span>
              <input 
                className="bg-transparent border-none focus:ring-0 text-xs w-48 outline-none px-2" 
                placeholder="Search console..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div 
              className="w-8 h-8 rounded-full bg-secondary overflow-hidden cursor-pointer"
              onClick={() => navigate(ROUTES.profile)}
            >
              <img 
                className="w-full h-full object-cover" 
                alt="Avatar" 
                src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuAh4GZbR-yLXyOdjNvqZqkKENkOuReoToaxfgNzjlzDyAQVKq9mRbG-0XcDbbgVrGFZoEIHcvovHP8TXsuZnpW9N558jvsdE9af8ILmwtEbrwt7UZt55jcd-jMkyLpsaY4c6gY-HZO-SaG_zZToGgXtO8bwDuGarb4fkx7aE4PWxizhXfToTBCFyYkGU3TWHiUamqDLRb_3uUGZBhS992iB2UxeeprwctF-4fDqRd1cc5ccX_ZPQ2W57g"} 
              />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 md:p-8 max-w-[1440px] mx-auto">
          {/* Page Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/10 text-secondary uppercase tracking-wider">
                  Verified SaaS Portal
                </span>
                <span className="text-xs text-slate-400 font-medium">• Portal Active</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-primary">{user?.companyName || user?.name || 'Company Portal'}</h2>
              <p className="text-xs md:text-sm text-on-surface-variant font-medium mt-1">Real-time telemetry, technician dispatch, and fleet metrics.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleExportReport}
                className="flex items-center gap-1 px-4 py-2 bg-secondary text-on-secondary text-xs font-semibold rounded hover:bg-secondary/90 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-sm" data-icon="download">download</span>
                Export Report
              </button>
            </div>
          </div>

          {/* Top Section: Overview Cards (Bento Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-6 rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-on-surface-variant">TOTAL REVENUE</span>
                  <span className="material-symbols-outlined text-secondary" data-icon="payments">payments</span>
                </div>
                <p className="text-3xl font-bold text-primary">${totalRevenueVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="mt-4 flex items-center gap-1">
                <span className="text-xs text-on-surface-variant">Accumulated sales</span>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-6 rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-on-surface-variant">TOTAL BOOKINGS</span>
                  <span className="material-symbols-outlined text-secondary" data-icon="event_available">event_available</span>
                </div>
                <p className="text-3xl font-bold text-primary">{totalBookingsCount}</p>
              </div>
              <div className="mt-4 flex items-center gap-1">
                <span className="text-xs text-on-surface-variant">Registered jobs</span>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-6 rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-on-surface-variant">PENDING JOBS</span>
                  <span className="material-symbols-outlined text-amber-500" data-icon="pending_actions">pending_actions</span>
                </div>
                <p className="text-3xl font-bold text-primary">{pendingCount}</p>
              </div>
              <div className="mt-4 flex items-center gap-1">
                <span className="text-xs text-on-surface-variant">Awaiting dispatch</span>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-slate-200 p-6 rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-on-surface-variant">COMPLETED</span>
                  <span className="material-symbols-outlined text-emerald-600" data-icon="task_alt">task_alt</span>
                </div>
                <p className="text-3xl font-bold text-primary">{completedCount}</p>
              </div>
              <div className="mt-4 flex items-center gap-1">
                <span className="text-xs text-on-surface-variant">Successfully fulfilled</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation & Latest Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Quick Navigation */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-lg font-bold text-primary">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link to={ROUTES.companyBookings} className="bg-white border border-slate-200 p-4 rounded-xl hover:shadow-md transition-all flex flex-col items-center text-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-2xl" data-icon="calendar_today">calendar_today</span>
                  <span className="text-xs font-bold">Manage Bookings</span>
                </Link>
                <Link to={ROUTES.companyInventory} className="bg-white border border-slate-200 p-4 rounded-xl hover:shadow-md transition-all flex flex-col items-center text-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-2xl" data-icon="inventory_2">inventory_2</span>
                  <span className="text-xs font-bold">Add Inventory</span>
                </Link>
                <Link to={ROUTES.companyTechnicians} className="bg-white border border-slate-200 p-4 rounded-xl hover:shadow-md transition-all flex flex-col items-center text-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-2xl" data-icon="badge">badge</span>
                  <span className="text-xs font-bold">Add Staff</span>
                </Link>
                <Link to={ROUTES.companyServices} className="bg-white border border-slate-200 p-4 rounded-xl hover:shadow-md transition-all flex flex-col items-center text-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-2xl" data-icon="build">build</span>
                  <span className="text-xs font-bold">Add Services</span>
                </Link>
              </div>
            </div>

            {/* Latest Jobs Table */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-base font-bold text-primary">Recent Active Jobs</h3>
                <Link className="text-xs font-bold text-secondary hover:underline" to={ROUTES.companyBookings}>View All</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Asset / Order ID</th>
                      <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Technician</th>
                      <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Service</th>
                      <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-3 font-semibold text-slate-500 uppercase text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium">{job.id}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px]">
                              {job.tech.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-800">{job.tech}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{job.service}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${job.statusColor}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-semibold text-slate-900">{job.revenue}</td>
                      </tr>
                    ))}

                    {activeJobs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-10 text-center text-slate-400">
                          <p className="text-xs font-semibold text-slate-600">No active jobs in your portal yet.</p>
                          <p className="text-[11px] text-slate-400 mt-1">Use the quick action buttons above to add services, staff, and bookings.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CompanyDashboard;
