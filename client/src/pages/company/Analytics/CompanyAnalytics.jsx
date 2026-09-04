import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import CompanyShell from '../../../components/company/CompanyShell';
import api, { getActiveSessionToken } from '../../../services/api';

const money = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;

export default function CompanyAnalytics() {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setData(await api.get('/company/dashboard', { noCache: true })); } catch (requestError) { setError(requestError.message); } }, []);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { withCredentials: true, auth: { token: getActiveSessionToken() }, transports: ['websocket', 'polling'] });
    const refresh = () => load();
    socket.on('booking:created', refresh);
    socket.on('booking:updated', refresh);
    socket.on('marketplace:updated', refresh);
    return () => socket.disconnect();
  }, [load]);
  const metrics = data?.metrics || {}; const revenue = data?.revenue || []; const max = Math.max(...revenue.map((item) => item.amount), 1);
  const summary = [['Recorded revenue', money(metrics.recordedRevenue), 'payments'], ['Total requests', metrics.totalBookings || 0, 'fact_check'], ['Completed work', metrics.completedJobs || 0, 'task_alt'], ['Active work', metrics.activeJobs || 0, 'monitoring']];
  return <CompanyShell title="Analytics" subtitle="Operational results for this company only, calculated from saved bookings and recorded payments.">
    {error && <p className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    {!data ? <div className="grid min-h-64 place-items-center text-slate-500">Loading company records…</div> : <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summary.map(([label, value, icon]) => <article key={label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><span className="material-symbols-outlined rounded-2xl bg-blue-50 p-3 text-blue-600">{icon}</span><p className="mt-5 text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-sm font-semibold text-slate-500">{label}</p></article>)}</section><section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Revenue trend</h2><p className="mt-1 text-sm text-slate-500">Recorded payments by month.</p></div><b className="text-sm text-slate-600">{money(metrics.recordedRevenue)}</b></div><div className="mt-8 flex h-56 items-end gap-3">{revenue.length ? revenue.map((item) => <div key={item.month} className="flex flex-1 flex-col items-center gap-2"><span className="text-xs font-bold text-slate-500">{money(item.amount)}</span><div className="w-full rounded-t-2xl bg-blue-600 transition-all" style={{ height: `${Math.max(8, item.amount / max * 100)}%` }} /><span className="text-xs font-bold text-slate-400">{item.month}</span></div>) : <p className="m-auto text-slate-500">Revenue will appear after payments are recorded.</p>}</div></section></>}
  </CompanyShell>;
}
