import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CompanyShell from '../../../components/company/CompanyShell';
import api from '../../../services/api';

const money = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;
const time = (value) => value ? new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';

function downloadCsv(bookings) {
  const rows = [['Reference', 'Customer', 'Request', 'Service', 'Assigned Staff', 'Status', 'Amount'], ...bookings.map((item) => [item.reference, item.customerName, item.vehicle?.label, item.serviceSnapshot?.name, item.technician?.name || 'Unassigned', item.status, item.pricing?.finalTotal])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fleetos-operations-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function CompanyDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    setError('');
    return api.get('/company/dashboard', { noCache: true }).then(setData).catch((requestError) => setError(requestError.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const bookings = data?.bookings || [];
  const filtered = useMemo(() => bookings.filter((booking) => [booking.reference, booking.customerName, booking.vehicle?.label, booking.serviceSnapshot?.name, booking.technician?.name, booking.status].some((value) => String(value || '').toLowerCase().includes(query.toLowerCase()))), [bookings, query]);
  const maxRevenue = Math.max(...(data?.revenue || []).map((item) => item.amount), 1);

  const assignFirstAvailable = async (booking) => {
    const tech = data.technicians.find((item) => item.status === 'Available');
    if (!tech) return setError('No available technician. Update technician availability first.');
    setBusy(booking._id);
    try { await api.post(`/bookings/${booking._id}/assign`, { technicianId: tech._id }); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(''); }
  };

  return (
    <CompanyShell
      title="Overview"
      subtitle="Welcome back, here&apos;s what&apos;s happening today."
      search={query}
      onSearch={setQuery}
      actions={(
        <button className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm relative">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        </button>
      )}
    >
          {error && <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-3"><span className="material-symbols-outlined">error</span> {error}</div>}

          {!data ? (
            <div className="py-32 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <section className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
                {[
                  ['account_balance_wallet', 'Revenue', money(data.metrics.recordedRevenue), 'text-emerald-600 bg-emerald-50'],
                  ['fact_check', 'Total Bookings', data.metrics.totalBookings, 'text-blue-600 bg-blue-50'],
                  ['pending_actions', 'Pending Requests', data.metrics.pendingDispatch, 'text-orange-600 bg-orange-50'],
                  ['task_alt', 'Completed Work', data.metrics.completedJobs, 'text-cyan-600 bg-cyan-50'],
                  ['groups', 'Available Staff', `${data.metrics.availableTechnicians}/${data.metrics.technicianTotal}`, 'text-purple-600 bg-purple-50'],
                ].map(([icon, label, value, colorClass]) => (
                  <div key={label} className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 hover:-translate-y-1 transition-transform">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${colorClass}`}>
                      <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
                    <p className="text-sm font-semibold text-slate-500 mt-1">{label}</p>
                  </div>
                ))}
              </section>

              <div className="grid xl:grid-cols-[minmax(0,2.2fr)_minmax(380px,1fr)] gap-8">
                <div className="space-y-8">
                  <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                      <h2 className="text-xl font-bold text-slate-900">Recent Bookings</h2>
                      <div className="flex gap-2">
                        <button onClick={() => navigate('/company/bookings')} className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-100 transition-colors">View All</button>
                        <button onClick={() => downloadCsv(bookings)} className="px-4 py-2 bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200 text-sm hover:bg-slate-100 transition-colors">Export</button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50">
                          <tr>
                            {['Booking Ref', 'Customer Details', 'Service', 'Status', 'Amount', 'Action'].map((head, index) => (
                              <th key={head} className={`p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider ${index === 0 ? 'pl-6' : ''} ${index === 5 ? 'pr-6 text-center' : ''}`}>{head}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.slice(0, 8).map((booking) => (
                            <tr key={booking._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 pl-6"><span className="font-mono text-sm font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">{booking.reference}</span></td>
                              <td className="p-4"><p className="font-bold text-slate-900 text-sm">{booking.customerName}</p><p className="text-xs text-slate-500 font-medium mt-0.5">{booking.vehicle?.label || 'Client request'} • {time(booking.scheduledAt)}</p></td>
                              <td className="p-4 text-sm font-medium text-slate-700">{booking.serviceSnapshot?.name}</td>
                              <td className="p-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${booking.status === 'Completed' || booking.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : booking.status === 'Pending' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>{booking.status}</span></td>
                              <td className="p-4 text-sm font-bold text-slate-900">{money(booking.pricing?.finalTotal)}</td>
                              <td className="p-4 pr-6 text-center">
                                {booking.status === 'Pending' ? <button disabled={busy === booking._id} onClick={() => assignFirstAvailable(booking)} className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">Assign Staff</button> : <button onClick={() => navigate('/company/bookings')} className="text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined">more_horiz</span></button>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100">
                    <h3 className="font-bold text-lg text-slate-900 mb-6 flex justify-between items-center">Revenue Trend <Link to="/company/analytics" className="text-sm text-blue-600 hover:underline">Details</Link></h3>
                    <div className="h-48 flex items-end gap-3">
                      {data.revenue.map((item) => (
                        <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="w-full bg-blue-100 rounded-t-xl relative overflow-hidden flex items-end" style={{ height: '100%' }}>
                            <div className="w-full bg-blue-500 rounded-t-xl transition-all duration-500 group-hover:bg-blue-600" style={{ height: `${Math.max(10, item.amount / maxRevenue * 100)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase">{item.month}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100">
                    <h3 className="font-bold text-lg text-slate-900 mb-4 flex justify-between items-center">Top Staff <Link to="/company/technicians" className="text-sm text-blue-600 hover:underline">Manage</Link></h3>
                    <div className="space-y-4">
                      {data.technicians.slice(0, 4).map((tech) => (
                        <div key={tech._id} className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">{tech.name.substring(0, 2).toUpperCase()}</div>
                          <div className="flex-1"><p className="font-bold text-sm text-slate-900">{tech.name}</p><p className="text-xs font-medium text-slate-500">{tech.completedJobs || 0} jobs completed</p></div>
                          <div className={`w-2.5 h-2.5 rounded-full ${tech.status === 'Available' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
    </CompanyShell>
  );
}

export default CompanyDashboard;

