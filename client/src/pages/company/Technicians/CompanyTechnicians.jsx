import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function CompanyTechnicians() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const companyId = user?.companyId || user?._id || 'company-1';

  const [technicians, setTechnicians] = useState(() => {
    const saved = localStorage.getItem(`fleetos-technicians-${companyId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [newTech, setNewTech] = useState({
    name: '',
    role: 'HVAC Specialist',
    phone: '',
    exp: '3 Years Exp.',
    avatarUrl: ''
  });

  useEffect(() => {
    async function loadTechnicians() {
      try {
        const data = await api.get(`/technicians?companyId=${companyId}`);
        if (data && Array.isArray(data.technicians)) {
          const mapped = data.technicians.map(t => ({
            id: t.techId || t._id,
            _id: t._id,
            name: t.name,
            role: t.role || 'Specialist',
            phone: t.phone || '',
            rating: Number(t.rating) || 0,
            exp: t.exp || '1 Year Exp.',
            status: t.status || 'Available',
            statusColor: t.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800',
            avatar: t.avatar || ''
          }));
          setTechnicians(mapped);
          localStorage.setItem(`fleetos-technicians-${companyId}`, JSON.stringify(mapped));
        }
      } catch (err) {}
    }
    loadTechnicians();
  }, [companyId]);

  useEffect(() => {
    localStorage.setItem(`fleetos-technicians-${companyId}`, JSON.stringify(technicians));
  }, [technicians, companyId]);

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTech({ ...newTech, avatarUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTech = async (e) => {
    e.preventDefault();
    if (!newTech.name || !newTech.phone) return;
    const newId = `TECH-${Math.floor(100 + Math.random() * 900)}`;
    const created = {
      id: newId,
      name: newTech.name,
      role: newTech.role,
      phone: newTech.phone,
      rating: 0,
      exp: newTech.exp || '1 Year Exp.',
      status: 'Available',
      statusColor: 'bg-emerald-100 text-emerald-800',
      avatar: newTech.avatarUrl || ''
    };

    try {
      const res = await api.post('/technicians', {
        companyId,
        techId: newId,
        name: newTech.name,
        role: newTech.role,
        phone: newTech.phone,
        exp: newTech.exp,
        avatar: newTech.avatarUrl
      });
      if (res.technician?._id) {
        created._id = res.technician._id;
      }
    } catch (err) {}

    setTechnicians([created, ...technicians]);
    setShowAddModal(false);
    setNewTech({ name: '', role: 'HVAC Specialist', phone: '', exp: '3 Years Exp.', avatarUrl: '' });
  };

  const toggleStatus = async (id) => {
    const target = technicians.find(t => t.id === id || t._id === id);
    if (!target) return;
    const nextStatus = target.status === 'Available' ? 'On Assignment' : 'Available';
    const nextColor = nextStatus === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800';

    setTechnicians(technicians.map(t => (t.id === id || t._id === id ? { ...t, status: nextStatus, statusColor: nextColor } : t)));
    if (target._id) {
      try { await api.put(`/technicians/${target._id}`, { status: nextStatus }); } catch {}
    }
  };

  const removeTechnician = async (id) => {
    const target = technicians.find(t => t.id === id || t._id === id);
    setTechnicians(technicians.filter(t => t.id !== id && t._id !== id));
    if (target?._id) {
      try { await api.del(`/technicians/${target._id}`); } catch {}
    }
  };

  const filtered = technicians.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.role.toLowerCase().includes(search.toLowerCase())
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
          <Link className="flex items-center gap-3 bg-secondary-container text-on-secondary-container border-l-4 border-secondary px-6 py-3 transition-all" to={ROUTES.companyTechnicians}>
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
          <h1 className="text-lg font-bold text-primary">Technicians & Staff</h1>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Add Technician
          </button>
        </header>

        <div className="p-4 md:p-8 max-w-[1440px] mx-auto space-y-6">
          {/* Top Bar Search */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input 
                type="text"
                placeholder="Search technician by name or role..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-secondary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{filtered.length}</span> technicians
            </div>
          </div>

          {/* Technicians Grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(tech => (
                <div key={tech.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {tech.avatar ? (
                          <img className="w-12 h-12 rounded-full object-cover border border-slate-200" src={tech.avatar} alt={tech.name} />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                            {tech.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{tech.name}</h3>
                          <p className="text-xs text-secondary font-semibold">{tech.role}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tech.statusColor}`}>
                        {tech.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 mb-6">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="font-bold text-slate-900">{tech.rating > 0 ? tech.rating : 'No Rating Yet'}</span>
                        <span className="text-slate-400">• {tech.exp}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-base">call</span>
                        <span>{tech.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <button 
                      onClick={() => removeTechnician(tech.id)}
                      className="text-xs text-rose-600 hover:underline font-medium"
                    >
                      Remove
                    </button>
                    <button 
                      onClick={() => toggleStatus(tech.id)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Toggle Duty Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <span className="material-symbols-outlined text-3xl">badge</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">No Technicians Added</h3>
                <p className="text-xs text-slate-500 mt-1">Add maintenance specialists, mechanics and drivers to dispatch service jobs.</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                Add First Technician
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Add Technician Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Technician</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleAddTech} className="space-y-3 text-xs">
              <div className="flex items-center gap-4 py-2 border-b pb-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                  {newTech.avatarUrl ? (
                    <img className="w-full h-full object-cover" src={newTech.avatarUrl} alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-2xl">person</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Technician Photo</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageFile}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 hover:file:bg-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Technician Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-secondary" 
                  placeholder="Full name"
                  value={newTech.name}
                  onChange={(e) => setNewTech({ ...newTech, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Specialization / Role</label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-secondary bg-white"
                  value={newTech.role}
                  onChange={(e) => setNewTech({ ...newTech, role: e.target.value })}
                >
                  <option value="HVAC Specialist">HVAC Specialist</option>
                  <option value="Master Electrician">Master Electrician</option>
                  <option value="Plumbing & Hydraulic Lead">Plumbing & Hydraulic Lead</option>
                  <option value="Heavy Engine Specialist">Heavy Engine Specialist</option>
                  <option value="Brake & Suspension Specialist">Brake & Suspension Specialist</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  required
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-secondary" 
                  placeholder="+1 (555) 000-0000"
                  value={newTech.phone}
                  onChange={(e) => setNewTech({ ...newTech, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Experience Level</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-secondary" 
                  placeholder="e.g. 4 Years Exp."
                  value={newTech.exp}
                  onChange={(e) => setNewTech({ ...newTech, exp: e.target.value })}
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
                  className="px-4 py-2 bg-secondary text-white rounded-lg font-semibold hover:opacity-90"
                >
                  Save Technician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyTechnicians;
