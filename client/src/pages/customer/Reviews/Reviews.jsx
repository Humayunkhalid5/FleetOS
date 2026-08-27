import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import api, { getActiveSessionToken } from '../../../services/api';
import CustomerTopNav from '../../../components/customer/CustomerTopNav';

function Reviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReviews = useCallback(async () => {
      try {
        const response = await api.get('/reviews');
        setReviews(response.reviews || []);
      } catch (err) {
        setError(err.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
  }, []);
  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { withCredentials: true, auth: { token: getActiveSessionToken() }, transports: ['websocket', 'polling'] });
    socket.on('review:created', fetchReviews);
    return () => socket.disconnect();
  }, [fetchReviews]);

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="client-dashboard-shell text-[#0D1B2A] min-h-screen pb-32">
      <CustomerTopNav title="Reviews" subtitle="Review your submitted ratings and share feedback after completed bookings." backTo={ROUTES.companies} />

      <main className="pt-10 px-container-margin max-w-3xl mx-auto space-y-lg">
        {/* Summary */}
        <section className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low flex items-center gap-md">
          <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">rate_review</span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Your Reviews</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">{reviews.length} reviews submitted</p>
          </div>
        </section>

        {loading && <p className="text-center text-on-surface-variant font-body-md py-xl">Loading reviews...</p>}
        {error && <p className="text-center text-error font-body-md py-xl">{error}</p>}

        {/* Review List */}
        {!loading && !error && reviews.length === 0 && (
          <p className="text-center text-on-surface-variant font-body-md py-xl">No reviews yet. Share your first review!</p>
        )}

        {reviews.map((review) => (
          <section key={review._id} className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low">
            <div className="flex items-center justify-between mb-md">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-fixed">
                  {review.company?.logo ? (
                    <img className="w-full h-full object-contain bg-white p-1" alt={`${review.company?.name || 'Company'} logo`} src={review.company.logo} />
                  ) : (
                    <span className="w-full h-full bg-[#1B263B] text-white font-black grid place-items-center">{String(review.company?.name || 'C').charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-body-lg text-body-lg font-bold text-on-surface">{review.company?.name}</h4>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{review.booking?.serviceSnapshot?.name} • {formatDate(review.createdAt)}</p>
                </div>
              </div>
              <div className="flex text-yellow-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                ))}
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">"{review.comment}"</p>
          </section>
        ))}

        {/* Write a Review */}
        <button
          onClick={() => navigate(ROUTES.serviceReview)}
          className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors shadow-md flex items-center justify-center gap-sm"
        >
          <span className="material-symbols-outlined">add</span>
          Write a New Review
        </button>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-container-margin py-sm bg-surface shadow-[0_-4px_16px_0_rgba(11,29,45,0.12)] rounded-t-xl md:hidden">
        <a href={ROUTES.dashboard} onClick={(e) => { e.preventDefault(); navigate(ROUTES.dashboard); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-all duration-150">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-nav-item text-[10px] mt-0.5">Dashboard</span>
        </a>
        <a href={ROUTES.bookings} onClick={(e) => { e.preventDefault(); navigate(ROUTES.bookings); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-all duration-150">
          <span className="material-symbols-outlined">event_note</span>
          <span className="font-nav-item text-[10px] mt-0.5">Bookings</span>
        </a>
        <a href={ROUTES.bookings} onClick={(e) => { e.preventDefault(); navigate(ROUTES.bookings); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-all duration-150">
          <span className="material-symbols-outlined">search</span>
          <span className="font-nav-item text-[10px] mt-0.5">Search</span>
        </a>
        <a href={ROUTES.profile} onClick={(e) => { e.preventDefault(); navigate(ROUTES.profile); }} className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-xl px-4 py-1 scale-95 active:scale-90 transition-all duration-150">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          <span className="font-nav-item text-[10px] mt-0.5">Profile</span>
        </a>
      </nav>
    </div>
  );
}

export default Reviews;

