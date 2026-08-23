import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';

function Notifications() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/bookings').then((result) => setBookings(result.bookings || [])).catch((requestError) => setError(requestError.message)); }, []);
  const notifications = useMemo(() => bookings.flatMap((booking) => (booking.statusHistory || []).map((entry) => ({ id: `${booking._id}-${entry.status}-${entry.at}`, title: `Booking ${entry.status}`, body: `${booking.reference} · ${booking.serviceSnapshot?.name}`, at: entry.at, status: entry.status }))).sort((a, b) => new Date(b.at) - new Date(a.at)), [bookings]);
  return <div className="min-h-screen bg-[#f7f9fc] text-slate-900"><header className="h-16 bg-white border-b px-5 md:px-8 flex justify-between items-center"><Link to="/customer/companies" className="font-bold text-xl text-[#071f3d]">FleetOS</Link><Link to="/customer/companies" className="text-sm text-blue-600">← Dashboard</Link></header><main className="max-w-3xl mx-auto p-5 md:p-8"><h1 className="text-2xl font-bold">Notifications</h1><p className="text-sm text-slate-500 mt-1">Booking events derived from your MongoDB history.</p>{error && <p className="mt-5 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</p>}<section className="mt-6 bg-white border rounded-xl divide-y overflow-hidden">{notifications.length ? notifications.map((item) => <article key={item.id} className="p-4 flex gap-4"><span className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 grid place-items-center"><span className="material-symbols-outlined">notifications_active</span></span><div className="flex-1"><b className="text-sm">{item.title}</b><p className="text-sm text-slate-600 mt-1">{item.body}</p><small className="text-slate-400 mt-2 block">{new Date(item.at).toLocaleString()}</small></div><span className="text-xs h-fit px-2 py-1 bg-slate-100 rounded">{item.status}</span></article>) : <p className="p-10 text-center text-slate-500">Booking updates will appear here.</p>}</section></main></div>;
}

export default Notifications;
