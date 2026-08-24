import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function CompanyServices() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const companyId = user?.companyId || user?._id || 'company-1';

  const [services, setServices] = useState([]);

  const [newSvc, setNewSvc] = useState({
    name: '',
    category: 'Mechanical',
    price: 150,
    duration: '1 Hour',
    status: 'Active'
  });

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await api.get(`/services?companyId=${companyId}`);
        if (data && Array.isArray(data.services)) {
          const mapped = data.services.map(s => ({
            id: s.serviceId || s._id,
            _id: s._id,
            name: s.name,
            category: s.category || 'Mechanical',
            price: Number(s.price) || 0,
            duration: `${s.durationMinutes || 60} Minutes`,
            status: s.status || 'Active'
          }));
          setServices(mapped);
        }
      } catch (err) { window.alert(err.message); }
    }
    loadServices();
  }, [companyId]);

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!newSvc.name) return;
    try {
      const res = await api.post('/services', { ...newSvc, durationMinutes: Number.parseInt(newSvc.duration, 10) || 60 });
      const record = res.service;
      const created = { id: record.serviceId, _id: record._id, name: record.name, category: record.category, price: record.price, duration: `${record.durationMinutes} Minutes`, status: record.status };
      setServices([created, ...services]);
    } catch (err) { window.alert(err.message); return; }
    setShowAddModal(false);
    setNewSvc({ name: '', category: 'Mechanical', price: 150, duration: '1 Hour', status: 'Active' });
  };

  const toggleStatus = async (id) => {
    const target = services.find(s => s.id === id || s._id === id);
    if (!target) return;
    const nextStatus = target.status === 'Active' ? 'Inactive' : 'Active';
    setServices(services.map(s => (s.id === id || s._id === id ? { ...s, status: nextStatus } : s)));
    if (target._id) {
      try { await api.put(`/services/${target._id}`, { status: nextStatus }); } catch (err) { window.alert(err.message); setServices(services); }
    }
  };

  const removeService = async (id) => {
    const target = services.find(s => s.id === id || s._id === id);
    if (!window.confirm(`Remove ${target?.name || 'this service'}?`)) return;
    setServices(services.filter(s => s.id !== id && s._id !== id));
    if (target?._id) {
      try { await api.del(`/services/${target._id}`); } catch (err) { window.alert(err.message); setServices(services); }
    }
  };

  const filtered = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.category.toLowerCase().includes(search.toLowerCase())
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
          <Link className="flex items-center gap-3 bg-blue-50 text-blue-700 px-6 py-3 transition-all rounded-2xl mx-4" to={ROUTES.companyServices}>
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
          <Link className="flex items-center gap-3 text-slate-500 px-6 py-3 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-2xl mx-4" to={ROUTES.companyReviews}>
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Service Catalog & Pricing</h1>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Service
          </button>
        </header>

        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
          {/* Header Actions */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input 
                type="text" 
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                placeholder="Search catalog services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Total Active Services: <span className="font-bold text-slate-800">{services.filter(s => s.status === 'Active').length}</span>
            </p>
          </div>

          {/* Services Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Service ID</th>
                    <th className="px-6 py-4">Service Title</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Est. Duration</th>
                    <th className="px-6 py-4">Price ($)</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(service => (
                    <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500 font-medium">{service.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{service.name}</td>
                      <td className="px-6 py-4 text-slate-600">{service.category}</td>
                      <td className="px-6 py-4 text-slate-500">{service.duration}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">${service.price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          service.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {service.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button 
                          onClick={() => removeService(service.id)}
                          className="text-xs text-rose-600 hover:underline font-medium"
                        >
                          Remove
                        </button>
                        <button 
                          onClick={() => toggleStatus(service.id)}
                          className="px-3 py-1 border border-slate-200 rounded text-xs font-semibold hover:bg-slate-50"
                        >
                          {service.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                        <div className="space-y-3">
                          <span className="material-symbols-outlined text-4xl text-slate-300">build</span>
                          <h4 className="text-sm font-bold text-slate-800">No Services in Catalog</h4>
                          <p className="text-xs text-slate-400">Add custom services or product offers published by your company portal.</p>
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Add First Service
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Service Catalog Entry</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Service Title</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                  placeholder="e.g. Premium installation, product demo, or support package"
                  value={newSvc.name}
                  onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 bg-white"
                    value={newSvc.category}
                    onChange={(e) => setNewSvc({ ...newSvc, category: e.target.value })}
                  >
                    <option value="Professional Service">Professional Service</option>
                    <option value="Retail Product">Retail Product</option>
                    <option value="Installation">Installation</option>
                    <option value="Repair & Support">Repair & Support</option>
                    <option value="Home Service">Home Service</option>
                    <option value="Business Service">Business Service</option>
                    <option value="Digital Service">Digital Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Est. Duration</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                    placeholder="1.5 Hours"
                    value={newSvc.duration}
                    onChange={(e) => setNewSvc({ ...newSvc, duration: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Standard Price (PKR)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                  value={newSvc.price}
                  onChange={(e) => setNewSvc({ ...newSvc, price: e.target.value })}
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:opacity-90"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyServices;


