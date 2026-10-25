import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES, companyRoute } from '../../../constants';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { Alert, EmptyState, SkeletonRows, Stars } from '../../../components/ui';
import { CompanyLogo } from '../../../components/customer/CompanyCard';
import { formatDate } from '../../../utils/helpers';

function Reviews() {
  const navigate = useNavigate();
  const { data, error, loading, refresh } = useLiveQuery('/reviews', { events: ['review:created', 'review:updated'] });
  const { data: bookingData } = useLiveQuery('/bookings', { events: ['booking:updated'] });
  const reviews = useMemo(() => data?.reviews || [], [data]);
  const reviewedIds = new Set(reviews.map((review) => String(review.booking?._id || review.booking)));
  const toReview = (bookingData?.bookings || []).filter((booking) => ['Completed', 'Paid'].includes(booking.status) && !reviewedIds.has(String(booking._id)));

  usePageChrome({ title: 'Reviews', subtitle: 'Your ratings help other customers choose well.' });

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      {toReview.length > 0 && (
        <section className="card overflow-hidden border-brand-line">
          <div className="card-header bg-brand-soft/40"><h2 className="card-title">Waiting for your review</h2><span className="badge badge-brand">{toReview.length}</span></div>
          <ul className="divide-y divide-line">
            {toReview.map((booking) => (
              <li key={booking._id} className="flex items-center gap-3 px-5 py-3">
                <CompanyLogo company={booking.company} size={36} />
                <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold">{booking.serviceSnapshot?.name}</p><p className="truncate text-[12.5px] text-subtle">{booking.company?.name} · {formatDate(booking.scheduledAt)}</p></div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`${ROUTES.serviceReview}?bookingId=${booking._id}`, { state: { bookingId: booking._id } })}><span className="material-symbols-outlined">star</span>Rate</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Alert onRetry={refresh}>{error && !data ? error.message : ''}</Alert>
      <section className="card overflow-hidden">
        <div className="card-header"><h2 className="card-title">Your reviews</h2><span className="text-[12.5px] text-subtle">{reviews.length} published</span></div>
        {loading ? <div className="p-5"><SkeletonRows rows={3} /></div> : reviews.length ? (
          <ul className="divide-y divide-line">
            {reviews.map((review) => (
              <li key={review._id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <CompanyLogo company={review.company} size={40} />
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => review.company && navigate(companyRoute(review.company.slug || review.company._id))} className="truncate text-left text-[14.5px] font-semibold hover:text-brand-fg">{review.company?.name}</button>
                    <p className="truncate text-[12.5px] text-subtle">{review.booking?.serviceSnapshot?.name} · {formatDate(review.createdAt)}</p>
                  </div>
                  <Stars value={review.rating} size={16} />
                </div>
                <p className="mt-3 text-[14px] leading-6 text-muted">{review.comment}</p>
                {review.reply?.text && <div className="mt-3 rounded-xl border-l-2 border-brand bg-sunken px-3 py-2 text-[13px]"><p className="font-semibold text-ink">Reply from {review.company?.name}</p><p className="mt-0.5 text-muted">{review.reply.text}</p></div>}
              </li>
            ))}
          </ul>
        ) : <EmptyState icon="rate_review" title="No reviews yet">After a job is completed you can rate it from here or from your bookings.</EmptyState>}
      </section>
    </div>
  );
}

export default Reviews;
