import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function CompanyReviews() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');

  const companyId = user?.companyId || user?._id || 'company-1';

  const [reviews, setReviews] = useState([]);

  const [replyInputs, setReplyInputs] = useState({});

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await api.get(`/reviews?companyId=${companyId}`);
        if (data && Array.isArray(data.reviews)) {
          const mapped = data.reviews.map(r => ({
            id: r._id || Date.now(),
            customer: r.customer?.name || 'Verified Customer',
            service: r.booking?.serviceSnapshot?.name || 'Completed Company Service',
            tech: r.technician || 'Assigned Specialist',
            rating: Number(r.rating) || 5,
            date: new Date(r.createdAt || Date.now()).toLocaleDateString(),
            comment: r.comment || '',
            reply: r.reply?.text || ''
          }));
          setReviews(mapped);
        }
      } catch (err) {}
    }
    loadReviews();
  }, [companyId]);

  const handleReplySubmit = async (id) => {
    const text = replyInputs[id];
    if (!text) return;
    setReviews(reviews.map(r => r.id === id ? { ...r, reply: text } : r));
    setReplyInputs({ ...replyInputs, [id]: '' });
    try {
      await api.put(`/reviews/${id}/reply`, { reply: text });
    } catch (err) {}
  };

  const filtered = reviews.filter(r => 
    r.customer.toLowerCase().includes(search.toLowerCase()) || 
    r.service.toLowerCase().includes(search.toLowerCase()) ||
    r.comment.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-[#f4f7fb] text-slate-800 min-h-screen font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-full w-[260px] fixed left-0 top-0 bg-white border-r border-slate-100 text-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.02)] py-6 z-50">
        <div className="px-6 mb-6">
          <span className="text-xl font-bold text-slate-900">FleetOS</span>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-white/20">
              <img className="w-full h-full object-cover" alt="Avatar" src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDob1EAfuIbOEB4mJ8aEtGMOAqZ2pFY3XlqCk2JkHoW67b-ZOBUc5zFlRYqQ2BZ3DG67ncjfW2OLoo5hg7xuxYuAqd8Dnt5ilPQQXVTUmumtWf50x262r2EhICAmE-N5bwuBjLhajhwN27J-KOxykfXlTI8WYp4DU3gYg4J6dBnKMvJL7SnjiVZ4DXESV3KRM6gWcKX9-Ly_MH0qvOPlsnmmbJxlvGssOUoAAS512hpEREvE9kMnIHJ0g"} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">{user?.name || 'Company Admin'}</p>
              <p className="text-xs text-slate-500">{user?.companyName || 'Admin Console'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-grow space-y-1 overflow-y-auto py-2">
          <Link className="flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4" to={ROUTES.companyDashboard}>
            <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
            <span className="text-xs font-bold">Dashboard</span>
          </Link>
          <Link className="flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4" to={ROUTES.companyBookings}>
            <span className="material-symbols-outlined" data-icon="calendar_today">calendar_today</span>
            <span className="text-xs font-bold">Bookings</span>
          </Link>
          <Link className="flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4" to={ROUTES.companyTechnicians}>
            <span className="material-symbols-outlined" data-icon="badge">badge</span>
            <span className="text-xs font-bold">Technicians</span>
          </Link>
          <Link className="flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4" to={ROUTES.companyInventory}>
            <span className="material-symbols-outlined" data-icon="inventory_2">inventory_2</span>
            <span className="text-xs font-bold">Inventory</span>
          </Link>
          <Link className="flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4" to={ROUTES.companyServices}>
            <span className="material-symbols-outlined" data-icon="build">build</span>
            <span className="text-xs font-bold">Services</span>
          </Link>
          <Link className="flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4" to={ROUTES.companyCustomers}>
            <span className="material-symbols-outlined" data-icon="group">group</span>
            <span className="text-xs font-bold">Customers</span>
          </Link>
          <Link className="flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4" to={ROUTES.companyChat}>
            <span className="material-symbols-outlined" data-icon="chat">chat</span>
            <span className="text-xs font-bold">Client Messages</span>
          </Link>
          <Link className="flex items-center gap-3 bg-blue-50 text-blue-700 px-6 py-3 transition-all rounded-2xl mx-4" to={ROUTES.companyReviews}>
            <span className="material-symbols-outlined" data-icon="rate_review">rate_review</span>
            <span className="text-xs font-bold">Reviews</span>
          </Link>
          <Link className="flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4" to={ROUTES.companyAnalytics}>
            <span className="material-symbols-outlined" data-icon="monitoring">monitoring</span>
            <span className="text-xs font-bold">Analytics</span>
          </Link>
          <Link className="flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4" to={ROUTES.companyDetails}>
            <span className="material-symbols-outlined" data-icon="domain">domain</span>
            <span className="text-xs font-bold">Company Details</span>
          </Link>
          <Link className="flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4" to={ROUTES.companySettings}>
            <span className="material-symbols-outlined" data-icon="settings">settings</span>
            <span className="text-xs font-bold">Settings</span>
          </Link>
        </nav>

        <div className="px-6 mt-auto pt-4 space-y-1">
          <button onClick={() => { logout(); navigate(ROUTES.login); }} className="w-full flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4 text-left">
            <span className="material-symbols-outlined" data-icon="logout">logout</span>
            <span className="text-xs font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-[260px] flex-grow min-h-screen">
        <header className="sticky top-0 z-40 flex justify-between items-center w-full px-4 md:px-8 h-16 bg-[#f4f7fb]/85 backdrop-blur-xl border-b border-white/60">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Ratings & Reviews</h1>
        </header>

        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex justify-between items-center">
            <div className="relative w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input 
                type="text" 
                placeholder="Search reviews..." 
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">Total Reviews: <span className="font-bold text-slate-900">{reviews.length}</span></span>
          </div>

          <div className="space-y-4">
            {filtered.map(r => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{r.customer}</h3>
                    <p className="text-xs text-slate-500 font-medium">{r.service} • Tech: <span className="text-slate-800 font-semibold">{r.tech}</span></p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 text-sm">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  "{r.comment}"
                </p>

                {r.reply ? (
                  <div className="pl-4 border-l-2 border-blue-200 text-xs text-slate-600 bg-secondary/5 p-3 rounded-r-lg">
                    <span className="font-bold text-blue-600 block mb-1">Company Response:</span>
                    {r.reply}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="text" 
                      placeholder="Write a response to this customer..." 
                      className="flex-grow px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                      value={replyInputs[r.id] || ''}
                      onChange={(e) => setReplyInputs({ ...replyInputs, [r.id]: e.target.value })}
                    />
                    <button 
                      onClick={() => handleReplySubmit(r.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Post Reply
                    </button>
                  </div>
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
                <span className="material-symbols-outlined text-4xl text-slate-300">rate_review</span>
                <h4 className="text-sm font-bold text-slate-800">No Customer Reviews Yet</h4>
                <p className="text-xs text-slate-500">As clients book and complete services with your company, their ratings and reviews will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default CompanyReviews;


