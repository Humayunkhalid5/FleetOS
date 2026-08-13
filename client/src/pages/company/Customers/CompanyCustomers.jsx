import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function CompanyCustomers() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const companyId = user?.companyId || user?._id || 'company-1';

  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem(`fleetos-customers-${companyId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    async function loadCustomers() {
      try {
        const data = await api.get(`/customers?companyId=${companyId}`);
        if (data && Array.isArray(data.customers)) {
          const mapped = data.customers.map(c => ({
            id: c.customerId || c._id,
            _id: c._id,
            name: c.name,
            contact: c.contact || c.name,
            email: c.email || '',
            phone: c.phone || '',
            address: c.address || '',
            totalJobs: c.totalJobs || 0,
            totalSpent: c.totalSpent || '$0.00',
            status: c.status || 'Active Account'
          }));
          setCustomers(mapped);
          localStorage.setItem(`fleetos-customers-${companyId}`, JSON.stringify(mapped));
        }
      } catch (err) {}
    }
    loadCustomers();
  }, [companyId]);

  useEffect(() => {
    localStorage.setItem(`fleetos-customers-${companyId}`, JSON.stringify(customers));
  }, [customers, companyId]);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name) return;
    const newId = `CUST-${Math.floor(100 + Math.random() * 900)}`;
    const created = {
      id: newId,
      name: newCustomer.name,
      contact: newCustomer.contact || newCustomer.name,
      email: newCustomer.email,
      phone: newCustomer.phone,
      totalJobs: 0,
      totalSpent: '$0.00',
      status: 'Active Account'
    };

    try {
      const res = await api.post('/customers', {
        companyId,
        customerId: newId,
        ...newCustomer
      });
      if (res.customer?._id) {
        created._id = res.customer._id;
      }
    } catch (err) {}

    setCustomers([created, ...customers]);
    setShowAddModal(false);
    setNewCustomer({ name: '', contact: '', email: '', phone: '', address: '' });
  };

  const removeCustomer = async (id) => {
    const target = customers.find(c => c.id === id || c._id === id);
    setCustomers(customers.filter(c => c.id !== id && c._id !== id));
    if (target?._id) {
      try { await api.del(`/customers/${target._id}`); } catch {}
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.contact.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

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
          <Link className="flex items-center gap-3 bg-secondary-container text-on-secondary-container border-l-4 border-secondary px-6 py-3 transition-all" to={ROUTES.companyCustomers}>
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
          <h1 className="text-lg font-bold text-primary">Corporate Customer Directory</h1>
        </header>

        <div className="p-4 md:p-8 max-w-[1440px] mx-auto space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div className="relative w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input 
                type="text" 
                placeholder="Search customers..." 
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-secondary" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">Total Accounts: <span className="font-bold text-slate-900">{customers.length}</span></span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <th className="px-6 py-3">Account ID</th>
                  <th className="px-6 py-3">Organization Name</th>
                  <th className="px-6 py-3">Primary Contact</th>
                  <th className="px-6 py-3">Completed Jobs</th>
                  <th className="px-6 py-3">Total Spend</th>
                  <th className="px-6 py-3">Account Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500 font-medium">{c.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{c.contact}</div>
                      <div className="text-slate-500 text-[11px]">{c.email} • {c.phone}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{c.totalJobs} Jobs</td>
                    <td className="px-6 py-4 font-bold text-slate-900 font-mono">{c.totalSpent}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => removeCustomer(c.id)} className="text-xs text-rose-600 hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      <div className="space-y-2">
                        <span className="material-symbols-outlined text-4xl text-slate-300">group</span>
                        <h4 className="text-sm font-bold text-slate-800">No Customers Recorded</h4>
                        <p className="text-xs text-slate-400">Clients who register and place service orders with your portal will appear here automatically.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CompanyCustomers;
