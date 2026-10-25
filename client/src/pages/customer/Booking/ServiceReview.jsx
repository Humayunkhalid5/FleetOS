import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import { Alert, Avatar, EmptyState, Skeleton, Spinner } from '../../../components/ui';

const LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];
const QUICK = ['On time', 'Clear communication', 'Professional staff', 'Fair price', 'Clean work'];

function ServiceReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useFeedback();
  const bookingId = location.state?.bookingId || new URLSearchParams(location.search).get('bookingId') || '';
  const { data, loading, error } = useLiveQuery(bookingId ? `/bookings/${bookingId}` : null, { keepPrevious: false });
  const booking = data?.booking;
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  // Quick tags are toggles kept apart from the free text, then joined on submit.
  const [tags, setTags] = useState([]);
  const toggleTag = (tag) => setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  const fullComment = [tags.join(' · '), comment.trim()].filter(Boolean).join(' — ');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  usePageChrome({ title: 'Rate your service', subtitle: booking ? `${booking.serviceSnapshot?.name} · ${booking.company?.name}` : '', backTo: ROUTES.bookings });

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!rating) return setFormError('Choose a star rating.');
    if (fullComment.length < 5) return setFormError('Pick a tag or add a few words about the job.');
    setSubmitting(true);
    try {
      await api.post('/reviews', { bookingId, rating, comment: fullComment });
      toast.success('Thanks — your review is now on the company profile.', { title: 'Review published' });
      navigate(ROUTES.reviews, { replace: true });
    } catch (requestError) {
      setFormError(requestError.message);
      setSubmitting(false);
    }
    return undefined;
  };

  if (!bookingId) return <div className="card"><EmptyState icon="rate_review" title="Pick a completed booking to review" action={<button type="button" className="btn btn-primary" onClick={() => navigate(ROUTES.bookings)}>My bookings</button>} /></div>;
  if (loading) return <div className="mx-auto grid max-w-xl gap-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>;
  if (error || !booking) return <div className="card"><EmptyState icon="error" title="This booking can't be reviewed">{error?.message}</EmptyState></div>;
  if (!['Completed', 'Paid'].includes(booking.status)) return <div className="card"><EmptyState icon="hourglass_top" title="Reviews open after the job is completed" action={<button type="button" className="btn btn-primary" onClick={() => navigate(`${ROUTES.liveTracking}?bookingId=${bookingId}`)}>Track this booking</button>}>Current status: {booking.status}.</EmptyState></div>;

  const shown = hover || rating;

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-xl gap-5">
      <section className="card card-pad flex items-center gap-4">
        <Avatar name={booking.technician?.name || booking.company?.name} src={booking.technician?.avatar} size={48} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{booking.technician?.name || booking.company?.name}</p>
          <p className="truncate text-[13px] text-muted">{booking.serviceSnapshot?.name} · {new Date(booking.scheduledAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</p>
        </div>
        <span className="ref ml-auto">{booking.reference}</span>
      </section>

      <section className="card card-pad">
        <p className="text-center text-[15px] font-semibold">How did it go?</p>
        <div className="mt-4 flex justify-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" role="radio" aria-checked={rating === star} aria-label={`${star} star${star > 1 ? 's' : ''}`} onMouseEnter={() => setHover(star)} onClick={() => setRating(star)} className="rounded-xl p-1 transition-transform hover:scale-110">
              <span className={`material-symbols-outlined text-[44px] ${star <= shown ? 'icon-fill text-warning' : 'text-line-strong'}`}>star</span>
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-center text-[13.5px] font-semibold text-muted">{shown ? LABELS[shown - 1] : ''}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {QUICK.map((tag) => (
            <button key={tag} type="button" className="chip h-8 text-[12.5px]" aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)}>{tags.includes(tag) && <span className="material-symbols-outlined text-[15px]">check</span>}{tag}</button>
          ))}
        </div>
        <label className="field mt-5">
          <span className="label">Your review</span>
          <textarea className="textarea" rows={5} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What went well? Anything the company could improve?" />
          <span className="hint text-right">{comment.length}/1000 · shown publicly with your first name</span>
        </label>
        <Alert className="mt-4">{formError}</Alert>
        <button type="submit" disabled={submitting} className="btn btn-primary btn-lg mt-5 w-full">{submitting ? <><Spinner /> Publishing</> : 'Publish review'}</button>
      </section>
    </form>
  );
}

export default ServiceReview;
