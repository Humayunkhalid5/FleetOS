import { useEffect, useMemo, useState } from 'react';
import api from '../../../services/api';
import CustomerTopNav from '../../../components/customer/CustomerTopNav';

function Notifications() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/bookings').then((result) => setBookings(result.bookings || [])).catch((requestError) => setError(requestError.message)); }, []);
  const notifications = useMemo(() => bookings.flatMap((booking) => (booking.statusHistory || []).map((entry) => ({ id: `${booking._id}-${entry.status}-${entry.at}`, title: `Booking ${entry.status}`, body: `${booking.reference} · ${booking.serviceSnapshot?.name}`, at: entry.at, status: entry.status }))).sort((a, b) => new Date(b.at) - new Date(a.at)), [bookings]);
  return <div className="client-dashboard-shell min-h-screen text-[#0D1B2A]"><CustomerTopNav title="Notifications" subtitle="Important updates from your bookings and services." backTo="/customer/companies" /><main className="max-w-3xl mx-auto p-5 md:p-8"><h1 className="text-2xl font-black">Notifications</h1><p className="text-sm text-[#415A77] mt-1">Important updates from your bookings and services.</p>{error && <p className="mt-5 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</p>}<section className="mt-6 bg-white border border-[#E0E1DD] rounded-3xl divide-y overflow-hidden shadow-sm">{notifications.length ? notifications.map((item) => <article key={item.id} className="p-4 flex gap-4"><span className="w-10 h-10 rounded-full bg-[#E0E1DD] text-[#1B263B] grid place-items-center"><span className="material-symbols-outlined">notifications_active</span></span><div className="flex-1"><b className="text-sm">{item.title}</b><p className="text-sm text-[#415A77] mt-1">{item.body}</p><small className="text-slate-400 mt-2 block">{new Date(item.at).toLocaleString()}</small></div><span className="text-xs h-fit px-2 py-1 bg-slate-100 rounded">{item.status}</span></article>) : <p className="p-10 text-center text-[#415A77]">Booking updates will appear here.</p>}</section></main></div>;
}

export default Notifications;

