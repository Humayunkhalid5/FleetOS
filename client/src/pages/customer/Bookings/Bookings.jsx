import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { Alert, EmptyState, LifecycleRail, SkeletonRows, StatusBadge, Tabs } from '../../../components/ui';
import { CompanyLogo } from '../../../components/customer/CompanyCard';
import InvoiceModal from '../../../components/common/InvoiceModal';
import { formatCurrency } from '../../../utils/helpers';
import { bookingFulfillment, fulfillmentOf } from '../../../constants/fulfillment';

const ACTIVE = ['Pending', 'Assigned', 'En Route', 'Arrived', 'In Progress'];
const DONE = ['Completed', 'Paid'];

function Bookings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('active');
  const [invoiceFor, setInvoiceFor] = useState(null);
  const { data, error, loading, refresh } = useLiveQuery('/bookings', { events: ['booking:created', 'booking:updated'] });
  const { data: reviewData } = useLiveQuery('/reviews', { events: ['review:created'] });
  const reviewed = useMemo(() => new Set((reviewData?.reviews || []).map((review) => String(review.booking?._id || review.booking))), [reviewData]);

  usePageChrome({
    title: 'My bookings',
    subtitle: 'Follow active jobs, get invoices and rate completed work.',
    actions: <button type="button" className="btn btn-primary" onClick={() => navigate(ROUTES.companies)}><span className="material-symbols-outlined">add</span>New booking</button>,
  });

  const all = useMemo(() => (data?.bookings || []).filter((booking) => booking.serviceSnapshot?.category !== 'Inquiry'), [data]);
  const groups = {
    active: all.filter((booking) => ACTIVE.includes(booking.status)),
    done: all.filter((booking) => DONE.includes(booking.status)),
    cancelled: all.filter((booking) => booking.status === 'Cancelled'),
  };
  const list = groups[tab];

  return (
    <div className="grid gap-5">
      <Tabs value={tab} onChange={setTab} className="w-fit" tabs={[['active', 'Active', groups.active.length], ['done', 'Completed', groups.done.length], ['cancelled', 'Cancelled', groups.cancelled.length]]} />
      <Alert onRetry={refresh}>{error && !data ? error.message : ''}</Alert>

      {loading ? <div className="card card-pad"><SkeletonRows rows={4} /></div> : list.length ? (
        <div className="grid gap-4">
          {list.map((booking) => {
            const track = () => navigate(`${ROUTES.liveTracking}?bookingId=${booking._id}`, { state: { bookingId: booking._id } });
            const mode = bookingFulfillment(booking);
            const way = fulfillmentOf(mode);
            return (
              <article key={booking._id} className="card overflow-hidden">
                <div className="flex flex-wrap items-start gap-4 p-5">
                  <CompanyLogo company={booking.company} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15.5px] font-semibold">{(booking.quantity || 1) > 1 ? `${booking.quantity} × ` : ''}{booking.serviceSnapshot?.name}</h2>
                      <StatusBadge status={booking.status} fulfillment={mode} />
                    </div>
                    <p className="mt-0.5 text-[13px] text-muted">{booking.company?.name} · <span className="font-mono text-[12px]">{booking.reference}</span></p>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-subtle">
                      <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">event</span>{new Date(booking.scheduledAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                      <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">{way.icon}</span>{way.short}</span>
                      {mode !== 'remote' && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span><span className="max-w-[260px] truncate">{booking.location}</span></span>}
                      {booking.technician?.name && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">engineering</span>{booking.technician.name}</span>}
                    </p>
                  </div>
                  <p className="text-[16px] font-bold tabular-nums">{formatCurrency(booking.pricing?.finalTotal)}</p>
                </div>
                {booking.status !== 'Cancelled' && <div className="px-5 pb-4"><LifecycleRail status={booking.status} fulfillment={mode} compact /></div>}
                {booking.status === 'Cancelled' && booking.cancellationReason && <p className="px-5 pb-4 text-[13px] text-muted">Reason: {booking.cancellationReason}</p>}
                <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-sunken/40 px-5 py-3">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(ROUTES.chat, { state: { bookingId: booking._id } })}><span className="material-symbols-outlined">chat</span>Message</button>
                  {DONE.includes(booking.status) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setInvoiceFor(booking._id)}><span className="material-symbols-outlined">receipt_long</span>Invoice</button>}
                  {DONE.includes(booking.status) && !reviewed.has(String(booking._id)) && <button type="button" className="btn btn-soft btn-sm" onClick={() => navigate(`${ROUTES.serviceReview}?bookingId=${booking._id}`, { state: { bookingId: booking._id } })}><span className="material-symbols-outlined">star</span>Rate</button>}
                  {booking.status === 'Cancelled' || DONE.includes(booking.status)
                    ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(ROUTES.customizeBooking, { state: { companyId: booking.company?.slug || booking.company?._id, companyName: booking.company?.name, service: booking.serviceSnapshot?.name } })}><span className="material-symbols-outlined">replay</span>Book again</button>
                    : <button type="button" className="btn btn-primary btn-sm" onClick={track}><span className="material-symbols-outlined">{way.tracking ? 'my_location' : 'timeline'}</span>{way.tracking ? 'Track live' : 'View progress'}</button>}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={tab === 'active' ? 'event_available' : tab === 'done' ? 'task_alt' : 'event_busy'} title={tab === 'active' ? 'Nothing active right now' : tab === 'done' ? 'Nothing completed yet' : 'Nothing cancelled'} action={tab === 'active' && <button type="button" className="btn btn-primary" onClick={() => navigate(ROUTES.companies)}>Find a business</button>}>
            {tab === 'active' ? 'Orders and bookings you place show up here with live progress.' : 'They will appear here automatically.'}
          </EmptyState>
        </div>
      )}
      <InvoiceModal bookingId={invoiceFor} onClose={() => setInvoiceFor(null)} />
    </div>
  );
}

export default Bookings;
