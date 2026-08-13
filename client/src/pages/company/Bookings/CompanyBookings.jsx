import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function CompanyBookings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem(`fleetos-bookings-${user?.companyId || user?._id || 'default'}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [newBooking, setNewBooking] = useState({
    customer: '',
    service: '',
    date: '',
    amount: '',
    address: '',
    tech: 'Unassigned'
  });

  const companyId = user?.companyId || user?._id || 'company-1';

  const [companyTechs, setCompanyTechs] = useState([]);

  useEffect(() => {
    async function loadTechs() {
      try {
        const data = await api.get(`/technicians?companyId=${companyId}`);
        if (data && Array.isArray(data.technicians)) {
          setCompanyTechs(data.technicians);
        }
      } catch (err) {}
    }
    loadTechs();
  }, [companyId]);

  useEffect(() => {
    async function loadBookings() {
      try {
        const data = await api.get(`/bookings?companyId=${companyId}`);
        if (data && Array.isArray(data.bookings)) {
          const mapped = data.bookings.map(b => ({
            id: b.reference || (b._id ? `#FOS-${b._id.slice(-5).toUpperCase()}` : `#FOS-${Math.floor(10000 + Math.random()*90000)}`),
            _id: b._id,
            customer: b.customerName || b.user?.name || b.customer || 'Direct Client',
            customerPhone: b.customerPhone || b.user?.phone || '',
            customerEmail: b.customerEmail || b.user?.email || '',
            service: b.service?.name || b.service || 'Fleet Maintenance',
            date: b.scheduledDate ? `${b.scheduledDate} ${b.scheduledTime || ''}` : (b.createdAt ? new Date(b.createdAt).toLocaleDateString() : new Date().toLocaleDateString()),
            status: b.status || 'Pending',
            tech: b.technician || 'Unassigned',
            amount: b.total ? `$${Number(b.total).toFixed(2)}` : (b.servicePrice ? `$${Number(b.servicePrice).toFixed(2)}` : '$150.00'),
            address: b.location?.address || b.location || b.address || 'On-site Client Location'
          }));
          setBookings(mapped);
          localStorage.setItem(`fleetos-bookings-${companyId}`, JSON.stringify(mapped));
        }
      } catch (err) {
        // use local cache if network offline
      }
    }
    loadBookings();
  }, [companyId]);

  useEffect(() => {
    localStorage.setItem(`fleetos-bookings-${companyId}`, JSON.stringify(bookings));
  }, [bookings, companyId]);

  const updateStatus = async (id, newStatus) => {
    const updated = bookings.map(b => {
      if (b.id === id || b._id === id) {
        return { 
          ...b, 
          status: newStatus, 
          tech: newStatus === 'In Progress' && b.tech === 'Unassigned' ? 'Marcus Chen' : b.tech 
        };
      }
      return b;
    });
    setBookings(updated);
    const target = bookings.find(b => b.id === id || b._id === id);
    if (target?._id) {
      try { await api.put(`/bookings/${target._id}`, { status: newStatus }); } catch {}
    }
  };

  const assignTech = async (id, techName) => {
    const updated = bookings.map(b => {
      if (b.id === id || b._id === id) {
        return { ...b, tech: techName };
      }
      return b;
    });
    setBookings(updated);
    const target = bookings.find(b => b.id === id || b._id === id);
    if (target?._id) {
      try { await api.put(`/bookings/${target._id}`, { technician: techName }); } catch {}
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!newBooking.customer || !newBooking.service) return;

    const createdId = `#FOS-${Math.floor(10000 + Math.random() * 90000)}`;
    const createdItem = {
      id: createdId,
      customer: newBooking.customer,
      service: newBooking.service,
      date: newBooking.date || new Date().toLocaleString(),
      status: 'Pending',
      tech: newBooking.tech || 'Unassigned',
      amount: newBooking.amount.startsWith('$') ? newBooking.amount : `$${newBooking.amount || '150.00'}`,
      address: newBooking.address || 'Client Facility'
    };

    try {
      const res = await api.post('/bookings', {
        companyId,
        service: newBooking.service,
        technician: newBooking.tech,
        location: { address: newBooking.address },
        scheduledDate: newBooking.date,
        pricing: { finalTotal: parseFloat(newBooking.amount) || 150 }
      });
      if (res.booking?._id) {
        createdItem._id = res.booking._id;
      }
    } catch (err) {}

    setBookings([createdItem, ...bookings]);
    setShowAddModal(false);
    setNewBooking({ customer: '', service: '', date: '', amount: '', address: '', tech: 'Unassigned' });
  };

  const statusOptions = ['All', 'Pending', 'In Progress', 'Completed', 'Cancelled'];

  const filtered = bookings.filter(b => {
    const matchStatus = filterStatus === 'All' || b.status === filterStatus;
    const matchSearch = b.id.toLowerCase().includes(search.toLowerCase()) || 
                        b.customer.toLowerCase().includes(search.toLowerCase()) ||
                        b.service.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

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
          <Link className="flex items-center gap-3 bg-secondary-container text-on-secondary-container border-l-4 border-secondary px-6 py-3 transition-all" to={ROUTES.companyBookings}>
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
          <button onClick={() => { logout(); navigate(ROUTES.login); }} className="w-full flex items-center gap-3 text-on-primary-container px-6 py-3 hover:bg-white/10 transition-all text-left">
            <span className="material-symbols-outlined" data-icon="logout">logout</span>
            <span className="text-xs font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-[280px] flex-grow min-h-screen">
        <header className="sticky top-0 z-40 flex justify-between items-center w-full px-4 md:px-8 h-16 bg-background border-b border-outline-variant">
          <h1 className="text-lg font-bold text-primary">Fleet Bookings Manager</h1>
        </header>

        <div className="p-4 md:p-8 max-w-[1440px] mx-auto space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input 
                type="text" 
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-secondary" 
                placeholder="Search booking ID, customer or service..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {statusOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => setFilterStatus(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filterStatus === opt ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings Feed */}
          <div className="space-y-4">
            {filtered.map(b => (
              <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-900">{b.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      b.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                      b.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      b.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">{b.service}</h3>
                  <p className="text-xs text-slate-500 font-medium">Customer: <span className="text-slate-800 font-semibold">{b.customer}</span> • {b.date}</p>
                  <p className="text-xs text-slate-400">{b.address}</p>
                </div>

                <div className="flex flex-col md:items-end gap-3 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <span className="text-sm font-bold text-slate-900 font-mono">{b.amount}</span>

                  <div className="flex flex-wrap items-center gap-2">
                    <select 
                      className="px-2 py-1.5 border border-slate-200 rounded text-xs outline-none bg-slate-50 font-medium"
                      value={b.tech}
                      onChange={(e) => assignTech(b.id, e.target.value)}
                    >
                      <option value="Unassigned">Assign Tech...</option>
                      {companyTechs.map((t) => (
                        <option key={t._id || t.id} value={t.name}>{t.name} ({t.role || 'Tech'})</option>
                      ))}
                    </select>

                    {b.customerPhone && (
                      <a 
                        href={`tel:${b.customerPhone.replace(/\s+/g, '')}`}
                        className="px-2.5 py-1.5 border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded text-xs font-semibold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">call</span> Call
                      </a>
                    )}

                    <button
                      onClick={() => navigate(ROUTES.companyChat, { state: { roomId: companyId, clientName: b.customer } })}
                      className="px-2.5 py-1.5 border border-secondary text-secondary hover:bg-secondary/10 rounded text-xs font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">chat</span> Chat
                    </button>

                    {b.status === 'Pending' && (
                      <button 
                        onClick={() => updateStatus(b.id, 'In Progress')}
                        className="px-3 py-1.5 bg-secondary text-white rounded text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        Accept & Start
                      </button>
                    )}

                    {b.status === 'In Progress' && (
                      <button 
                        onClick={() => updateStatus(b.id, 'Completed')}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        Mark Completed
                      </button>
                    )}

                    {b.status !== 'Completed' && b.status !== 'Cancelled' && (
                      <button 
                        onClick={() => updateStatus(b.id, 'Cancelled')}
                        className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded text-xs font-semibold"
                      >
                        Cancel Job
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <span className="material-symbols-outlined text-3xl">event_busy</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">No Booking Requests Yet</h3>
                  <p className="text-xs text-slate-500 mt-1">Bookings submitted by clients in the Client Portal will appear here automatically.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal to Create Booking */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-slate-900">Create Booking Order</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateBooking} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Customer / Client Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metro Logistics"
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-secondary"
                  value={newBooking.customer}
                  onChange={(e) => setNewBooking({ ...newBooking, customer: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engine Diagnostics"
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-secondary"
                  value={newBooking.service}
                  onChange={(e) => setNewBooking({ ...newBooking, service: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Scheduled Date & Time</label>
                <input
                  type="text"
                  placeholder="e.g. Oct 24, 2:00 PM"
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-secondary"
                  value={newBooking.date}
                  onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Service Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. 742 Industrial Pkwy"
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-secondary"
                  value={newBooking.address}
                  onChange={(e) => setNewBooking({ ...newBooking, address: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Total Amount ($)</label>
                <input
                  type="number"
                  placeholder="150"
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-secondary"
                  value={newBooking.amount}
                  onChange={(e) => setNewBooking({ ...newBooking, amount: e.target.value })}
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:opacity-90"
                >
                  Save Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyBookings;
