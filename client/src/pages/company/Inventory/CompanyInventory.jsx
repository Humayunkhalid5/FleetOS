import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function CompanyInventory() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  const companyId = user?.companyId || user?._id || 'company-1';

  const [items, setItems] = useState([]);

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Spare Parts',
    qty: 10,
    threshold: 5,
    unitCost: 0,
    unitPrice: 0,
    unit: 'Units'
  });

  useEffect(() => {
    async function loadInventory() {
      try {
        const data = await api.get(`/inventory?companyId=${companyId}`);
        if (data && Array.isArray(data.inventory)) {
          const mapped = data.inventory.map(i => ({
            id: i.sku || i._id,
            _id: i._id,
            name: i.name,
            category: i.category || 'Spare Parts',
            qty: Number(i.qty) || 0,
            threshold: Number(i.threshold) || 5,
            unitCost: Number(i.unitCost) || 0,
            unitPrice: Number(i.unitPrice) || 0,
            unit: i.unit || 'Units'
          }));
          setItems(mapped);
        }
      } catch (err) {}
    }
    loadInventory();
  }, [companyId]);

  const updateQuantity = async (id, delta) => {
    const target = items.find(i => i.id === id || i._id === id);
    if (!target) return;
    const nextQty = Math.max(0, target.qty + delta);
    setItems(items.map(item => (item.id === id || item._id === id ? { ...item, qty: nextQty } : item)));
    if (target._id) {
      try { await api.put(`/inventory/${target._id}`, { qty: nextQty }); } catch {}
    }
  };

  const removeItem = async (id) => {
    const target = items.find(i => i.id === id || i._id === id);
    setItems(items.filter(item => item.id !== id && item._id !== id));
    if (target?._id) {
      try { await api.del(`/inventory/${target._id}`); } catch {}
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name) return;
    try {
      const res = await api.post('/inventory', newItem);
      const record = res.inventory;
      const created = { id: record.sku, _id: record._id, name: record.name, category: record.category, qty: record.quantity, threshold: record.reorderLevel, unitCost: record.unitCost, unitPrice: record.unitPrice, unit: record.unit };
      setItems([created, ...items]);
    } catch (err) { window.alert(err.message); return; }
    setShowAddModal(false);
    setNewItem({ name: '', category: 'Spare Parts', qty: 10, threshold: 5, unitCost: 0, unitPrice: 0, unit: 'Units' });
  };

  const categories = ['All', 'Spare Parts', 'Oils & Fluids', 'Electrical', 'Hoses & Fittings', 'Tools'];

  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                        item.id.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const lowStockCount = items.filter(i => i.qty <= i.threshold).length;
  const outOfStockCount = items.filter(i => i.qty === 0).length;
  const totalValuation = items.reduce((sum, i) => sum + (i.qty * i.unitCost), 0);

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
              <p className="text-xs font-bold text-slate-900">{user?.name || 'Fleet Manager'}</p>
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
          <Link className="flex items-center gap-3 bg-blue-50 text-blue-700 px-6 py-3 transition-all rounded-2xl mx-4" to={ROUTES.companyInventory}>
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fleet Inventory & Parts</h1>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Stock Item
          </button>
        </header>

        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
          {/* KPI Header Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-slate-500">Total SKUs</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-slate-500">Low Stock Alert</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined">warning</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-slate-500">Out of Stock</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{outOfStockCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined">block</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-slate-500">Stock Valuation</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined">attach_money</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input 
                type="text" 
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                placeholder="Search by part name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">SKU / ID</th>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Quantity</th>
                    <th className="px-6 py-4">Threshold</th>
                    <th className="px-6 py-4">Cost / Price</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    let statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        In Stock
                      </span>
                    );
                    if (item.qty === 0) {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Out of Stock
                        </span>
                      );
                    } else if (item.qty <= item.threshold) {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Low Stock
                        </span>
                      );
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-slate-500">{item.id}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 text-slate-600">{item.category}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {item.qty} <span className="text-[10px] font-normal text-slate-500">{item.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{item.threshold}</td>
                        <td className="px-6 py-4">
                          <span className="text-slate-500">${item.unitCost.toFixed(2)}</span> / <span className="font-semibold text-slate-900">${item.unitPrice.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4">{statusBadge}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="text-xs text-rose-600 hover:underline font-medium mr-1"
                            >
                              Delete
                            </button>
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center"
                              title="Decrease Stock"
                            >
                              -
                            </button>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center"
                              title="Increase Stock"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                        <div className="space-y-3">
                          <span className="material-symbols-outlined text-4xl text-slate-300">inventory</span>
                          <h4 className="text-sm font-bold text-slate-800">No Inventory Items Found</h4>
                          <p className="text-xs text-slate-400">Add parts, fluids, equipment or stock items to populate your company inventory.</p>
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Add First Inventory Item
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

      {/* Add New Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Inventory Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Item Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                  placeholder="e.g. Heavy Duty Brake Fluid"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 bg-white"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit of Measure</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                    placeholder="Units / Liters"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Initial Quantity</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                    value={newItem.qty}
                    onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Low Stock Threshold</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                    value={newItem.threshold}
                    onChange={(e) => setNewItem({ ...newItem, threshold: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Cost ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                    value={newItem.unitCost}
                    onChange={(e) => setNewItem({ ...newItem, unitCost: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" 
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                  />
                </div>
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
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyInventory;


