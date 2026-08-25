import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';
import CustomerTopNav from '../../../components/customer/CustomerTopNav';

function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.get('/bookings');
        setBookings(response.bookings || []);
      } catch (err) {
        setError(err.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const statusClass = (status) => {
    const map = {
      'In Progress': 'bg-tertiary-container text-on-tertiary-container',
      Completed: 'bg-secondary-container text-on-secondary-container',
      Paid: 'bg-secondary-container text-on-secondary-container',
      Cancelled: 'bg-error-container text-on-error-container',
      Pending: 'bg-surface-variant text-on-surface-variant',
    };
    return map[status] || 'bg-surface-variant text-on-surface-variant';
  };

  const statusLabel = (status) => {
    return status;
  };

  const filterMap = { 'All': 'all', 'In Progress': 'In Progress', 'Completed': 'Completed', 'Cancelled': 'Cancelled' };
  const filteredBookings = filter === 'All'
    ? bookings
    : bookings.filter(b => b.status === filterMap[filter]);

  return (
    <div className="client-dashboard-shell text-[#0D1B2A] min-h-screen pb-32">
      <CustomerTopNav title="My Bookings" subtitle="Review requests, tracking status, payments, and completed work." backTo={ROUTES.companies} />

      <main className="pt-10 px-container-margin max-w-3xl mx-auto space-y-lg">
        {/* Filters */}
        <div className="flex gap-sm overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin pb-1">
          {['All', 'In Progress', 'Completed', 'Cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-lg py-sm rounded-full font-nav-item text-nav-item transition-colors ${
                filter === f ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-on-surface-variant font-body-md py-xl">Loading bookings...</p>}
        {error && <p className="text-center text-error font-body-md py-xl">{error}</p>}

        {/* Booking Cards */}
        {!loading && !error && bookings.length === 0 && (
          <p className="text-center text-on-surface-variant font-body-md py-xl">No bookings yet. Book a service to get started!</p>
        )}

        {!loading && !error && bookings.length > 0 && filteredBookings.length === 0 && (
          <p className="text-center text-on-surface-variant font-body-md py-xl">No {filter.toLowerCase()} bookings found.</p>
        )}

        {filteredBookings.map((booking) => (
          <div key={booking._id} className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low relative overflow-hidden">
            <div className="absolute top-0 right-0 p-md">
              <span className={`px-md py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusClass(booking.status)}`}>{statusLabel(booking.status)}</span>
            </div>
            <div className="flex items-start gap-md">
              <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">engineering</span>
              </div>
              <div className="flex-1">
                <h4 className="font-body-lg text-body-lg font-bold text-on-surface">{booking.serviceSnapshot?.name}</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">{new Date(booking.scheduledAt).toLocaleString()}</p>
                <div className="mt-md flex items-center gap-sm">
                  <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-secondary-container text-[12px]">person</span>
                  </div>
                  <span className="text-body-md font-medium text-on-surface">{booking.technician?.name || 'Company will assign'}</span>
                </div>
                <p className="mt-sm text-xs text-outline">Reference: {booking.reference}</p>
              </div>
            </div>
            <div className="mt-lg pt-md border-t border-surface-container-high flex gap-md">
              {['Assigned', 'En Route', 'Arrived', 'In Progress'].includes(booking.status) ? (
                <>
                  <button
                    onClick={() => navigate(ROUTES.liveTracking, { state: { selectedTech: booking.technician, bookingId: booking._id } })}
                    className="flex-1 py-2 rounded-lg bg-secondary-container text-on-secondary-container font-medium text-body-md hover:bg-surface-container-high transition-colors"
                  >
                    Track Progress
                  </button>
                  <button onClick={() => navigate(ROUTES.serviceReview, { state: { selectedTech: booking.technician, bookingId: booking._id } })} className="flex-1 py-2 rounded-lg bg-surface-container-low text-on-surface-variant font-medium text-body-md hover:bg-surface-container-high transition-colors">
                    Leave Review
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate(ROUTES.customizeBooking)} className="flex-1 py-2 rounded-lg bg-secondary-container text-on-secondary-container font-medium text-body-md hover:bg-surface-container-high transition-colors">
                    Book Again
                  </button>
                  <button onClick={() => navigate(ROUTES.serviceReview, { state: { selectedTech: booking.technician, bookingId: booking._id } })} className="flex-1 py-2 rounded-lg bg-surface-container-low text-on-surface-variant font-medium text-body-md hover:bg-surface-container-high transition-colors">
                    Leave Review
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Book New */}
        <button
          onClick={() => navigate(ROUTES.customizeBooking)}
          className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors shadow-md flex items-center justify-center gap-sm"
        >
          <span className="material-symbols-outlined">add</span>
          Book a New Service
        </button>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-container-margin py-sm bg-surface shadow-[0_-4px_16px_0_rgba(11,29,45,0.12)] rounded-t-xl md:hidden">
        <a href={ROUTES.dashboard} onClick={(e) => { e.preventDefault(); navigate(ROUTES.dashboard); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-all duration-150">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-nav-item text-[10px] mt-0.5">Dashboard</span>
        </a>
        <a href={ROUTES.bookings} onClick={(e) => { e.preventDefault(); navigate(ROUTES.bookings); }} className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-xl px-4 py-1 scale-95 active:scale-90 transition-all duration-150">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>event_note</span>
          <span className="font-nav-item text-[10px] mt-0.5">Bookings</span>
        </a>
        <a href={ROUTES.bookings} onClick={(e) => { e.preventDefault(); navigate(ROUTES.bookings); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-all duration-150">
          <span className="material-symbols-outlined">search</span>
          <span className="font-nav-item text-[10px] mt-0.5">Search</span>
        </a>
        <a href={ROUTES.profile} onClick={(e) => { e.preventDefault(); navigate(ROUTES.profile); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-all duration-150">
          <span className="material-symbols-outlined">person</span>
          <span className="font-nav-item text-[10px] mt-0.5">Profile</span>
        </a>
      </nav>
    </div>
  );
}

export default Bookings;

