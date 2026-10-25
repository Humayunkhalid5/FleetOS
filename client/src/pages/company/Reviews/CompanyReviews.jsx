import { useMemo, useState } from 'react';
import api from '../../../services/api';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import { Alert, Avatar, EmptyState, SkeletonRows, Spinner, Stars, Tabs } from '../../../components/ui';
import { formatDate } from '../../../utils/helpers';

export default function CompanyReviews() {
  const { toast } = useFeedback();
  const { data, error, loading, refresh } = useLiveQuery('/reviews', { events: ['review:created', 'review:updated'] });
  const reviews = useMemo(() => data?.reviews || [], [data]);
  const [query, setQuery] = useState('');
  const [tab, setTabState] = useState('all');
  const [touched, setTouched] = useState(() => new Set());
  const setTab = (value) => { setTabState(value); setTouched(new Set()); };
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState('');

  const average = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => [star, reviews.filter((review) => Number(review.rating) === star).length]);
  const q = query.trim().toLowerCase();
  const list = reviews.filter((review) => (tab === 'all' || touched.has(review._id) || (tab === 'unanswered' ? !review.reply?.text : review.reply?.text)) && (!q || [review.customer?.name, review.booking?.serviceSnapshot?.name, review.comment].some((value) => String(value || '').toLowerCase().includes(q))));

  const reply = async (review) => {
    const text = String(drafts[review._id] || '').trim();
    if (!text) return;
    setBusy(review._id);
    setTouched((current) => new Set(current).add(review._id));
    try { await api.put(`/reviews/${review._id}/reply`, { reply: text }); setDrafts((current) => ({ ...current, [review._id]: '' })); toast.success('Reply published on your profile'); }
    catch (requestError) { toast.error(requestError.message); }
    finally { setBusy(''); }
  };

  usePageChrome({ title: 'Reviews', subtitle: 'What customers say after completed jobs. Replies appear on your public profile.', search: query, onSearch: setQuery });

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <aside className="card card-pad lg:sticky lg:top-24">
        <p className="text-[13px] text-muted">Average rating</p>
        <p className="mt-1 text-[40px] font-bold leading-none tracking-tight">{average ? average.toFixed(1) : '—'}</p>
        <div className="mt-2"><Stars value={average} size={18} /></div>
        <p className="mt-1 text-[12.5px] text-subtle">{reviews.length} review{reviews.length === 1 ? '' : 's'}</p>
        <ul className="mt-5 grid gap-2">
          {distribution.map(([star, count]) => (
            <li key={star} className="flex items-center gap-2 text-[12.5px]">
              <span className="w-3 text-muted">{star}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"><span className="block h-full rounded-full bg-warning" style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }} /></span>
              <span className="w-6 text-right tabular-nums text-subtle">{count}</span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="grid gap-4">
        <Tabs value={tab} onChange={setTab} className="w-fit" tabs={[['all', 'All', reviews.length], ['unanswered', 'Needs reply', reviews.filter((review) => !review.reply?.text).length], ['answered', 'Replied', reviews.filter((review) => review.reply?.text).length]]} />
        <Alert onRetry={refresh}>{error && !data ? error.message : ''}</Alert>
        {loading ? <div className="card card-pad"><SkeletonRows rows={4} /></div> : list.length ? list.map((review) => (
          <article key={review._id} className="card card-pad">
            <div className="flex items-start gap-3">
              <Avatar name={review.customer?.name} src={review.customer?.avatar} size={40} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{review.customer?.name || 'Customer'}</p>
                <p className="text-[12.5px] text-subtle">{review.booking?.serviceSnapshot?.name || 'Completed job'} · {formatDate(review.createdAt)}</p>
              </div>
              <Stars value={review.rating} size={16} />
            </div>
            <p className="mt-3 text-[14.5px] leading-7 text-ink">{review.comment}</p>
            {review.reply?.text ? (
              <div className="mt-4 rounded-xl border-l-2 border-brand bg-sunken px-4 py-3">
                <p className="text-[12.5px] font-semibold text-muted">Your reply · {formatDate(review.reply.repliedAt)}</p>
                <p className="mt-1 text-[14px]">{review.reply.text}</p>
              </div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); reply(review); }} className="mt-4 flex gap-2">
                <input className="input" value={drafts[review._id] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [review._id]: event.target.value }))} placeholder="Thank the customer or address their feedback" aria-label="Reply" />
                <button type="submit" className="btn btn-primary h-11" disabled={!String(drafts[review._id] || '').trim() || busy === review._id}>{busy === review._id ? <Spinner /> : 'Reply'}</button>
              </form>
            )}
          </article>
        )) : <div className="card"><EmptyState icon="reviews" title={q || tab !== 'all' ? 'Nothing here' : 'No reviews yet'}>Customers can review a job once it's completed.</EmptyState></div>}
      </div>
    </div>
  );
}
