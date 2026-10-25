import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';
import { useLiveQuery, setQueryData } from '../../../hooks/useLiveQuery';
import { useLiveEvent, useRealtime } from '../../../hooks/useRealtime';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import TrackingMap from '../../../components/common/TrackingMap';
import InvoiceModal from '../../../components/common/InvoiceModal';
import { Alert, Avatar, EmptyState, LifecycleRail, Skeleton, StatusBadge } from '../../../components/ui';
import { formatCurrency } from '../../../utils/helpers';
import { fulfillmentOf, statusLabel } from '../../../constants/fulfillment';

const HEADLINE = {
  Pending: ['Waiting for the company', 'Your booking has been received. The company will assign staff shortly.'],
  Assigned: ['Staff assigned', 'Your staff member is preparing to head out.'],
  'En Route': ['On the way', 'Your staff member is travelling to you.'],
  Arrived: ['Arrived', 'Your staff member has reached the service address.'],
  'In Progress': ['Work in progress', 'The job has started.'],
  Completed: ['Work completed', 'The company will record your payment and issue the invoice.'],
  Paid: ['Paid and closed', 'Thanks for using FleetOS. Tell others how it went.'],
  Cancelled: ['Booking cancelled', 'This booking will not proceed.'],
};

// What each step means when nobody travels to the customer (or the order is delivered).
const EXPLAIN = {
  delivery: { Pending: 'The business will confirm your order shortly.', Assigned: 'Your order is accepted and being prepared.', 'En Route': 'Your order is on its way to you.', Arrived: 'Your order has been delivered.', Completed: 'The business will record your payment and send the invoice.' },
  pickup: { Pending: 'The business will confirm your order shortly.', Assigned: 'Your order is accepted.', 'In Progress': 'Your order is being prepared.', Completed: 'Your order is ready. Show the reference when you collect it.' },
  instore: { Pending: 'The business will confirm your appointment shortly.', Assigned: 'Your appointment is confirmed. See you there.', Arrived: 'You are checked in.', 'In Progress': 'Your service has started.', Completed: 'All done. The business will record your payment.' },
  remote: { Pending: 'The business will accept your request shortly.', Assigned: 'Accepted. The business will be in touch in chat.', 'In Progress': 'Work is under way.', Completed: 'Your work has been delivered. Check the chat for files.' },
};

function LiveTracking() {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, toast } = useFeedback();
  const { socket, connected } = useRealtime();
  const bookingId = location.state?.bookingId || new URLSearchParams(location.search).get('bookingId') || '';
  const key = bookingId ? `/bookings/${bookingId}/tracking` : null;
  const { data, error, loading, refresh } = useLiveQuery(key, { events: ['booking:updated'], keepPrevious: false, interval: 60000 });
  const { data: reviewData } = useLiveQuery(bookingId ? '/reviews' : null, { events: ['review:created'] });
  const tracking = data?.tracking;
  const [me, setMe] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Join the booking room for live GPS updates.
  useEffect(() => {
    if (!socket || !connected || !bookingId) return undefined;
    socket.emit('join-booking', bookingId);
    return () => socket.emit('leave-booking', bookingId);
  }, [socket, connected, bookingId]);

  useLiveEvent(['tracking:update', 'tracking:snapshot'], (payload) => {
    if (!key || String(payload?.bookingId) !== String(bookingId)) return;
    setQueryData(key, (current) => current && {
      ...current,
      tracking: {
        ...current.tracking,
        ...(payload.tracking?.lat ? { lat: payload.tracking.lat, lng: payload.tracking.lng } : {}),
        etaMinutes: payload.tracking?.etaMinutes ?? current.tracking.etaMinutes,
        status: payload.status || current.tracking.status,
        updatedAt: payload.tracking?.updatedAt || current.tracking.updatedAt,
      },
    });
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition((position) => setMe({ lat: position.coords.latitude, lng: position.coords.longitude }), () => {}, { timeout: 8000, maximumAge: 60000 });
  }, []);

  const status = tracking?.status || 'Pending';
  const mode = tracking?.fulfillment || 'onsite';
  const way = fulfillmentOf(mode);
  const isOrder = mode === 'delivery' || mode === 'pickup';
  const [onsiteHeadline, onsiteExplainer] = HEADLINE[status] || HEADLINE.Pending;
  const headline = mode === 'onsite' ? onsiteHeadline : status === 'Cancelled' ? `${isOrder ? 'Order' : 'Booking'} cancelled` : statusLabel(status, mode);
  const explainer = mode === 'onsite' ? onsiteExplainer : EXPLAIN[mode]?.[status] || onsiteExplainer;
  const staff = tracking?.technician;
  const showStaff = staff && ['Assigned', 'En Route', 'Arrived', 'In Progress'].includes(status);
  const reviewed = (reviewData?.reviews || []).some((review) => String(review.booking?._id || review.booking) === String(bookingId));
  const phone = staff?.phone || tracking?.company?.phone;

  usePageChrome({
    title: tracking ? headline : 'Live tracking',
    subtitle: tracking ? `${(tracking.quantity || 1) > 1 ? `${tracking.quantity} × ` : ''}${tracking.service} · ${way.label} · ${tracking.reference}` : '',
    backTo: ROUTES.bookings,
  });

  const cancel = async () => {
    const noun = isOrder ? 'order' : 'booking';
    const ok = await confirm({ title: `Cancel this ${noun}?`, message: 'The business is notified straight away. You can book again at any time.', confirmLabel: `Cancel ${noun}`, cancelLabel: `Keep ${noun}`, tone: 'danger' });
    if (!ok) return;
    setCancelling(true);
    try {
      await api.patch(`/bookings/${bookingId}`, { status: 'Cancelled', reason: 'Cancelled by customer' });
      toast.success(`${isOrder ? 'Order' : 'Booking'} cancelled.`);
      refresh();
    } catch (requestError) { toast.error(requestError.message); }
    finally { setCancelling(false); }
  };

  if (!bookingId) return <div className="card"><EmptyState icon="my_location" title="Choose a booking to track" action={<button type="button" className="btn btn-primary" onClick={() => navigate(ROUTES.bookings)}>Open my bookings</button>}>Live tracking is available for each booking from your booking list.</EmptyState></div>;
  if (loading) return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"><Skeleton className="h-[60vh] rounded-3xl" /><div className="grid content-start gap-4"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div></div>;
  if (error && !tracking) return <div className="card"><EmptyState icon="error" title="Tracking isn't available" action={<button type="button" className="btn btn-primary" onClick={refresh}>Try again</button>}>{error.message}</EmptyState></div>;

  const staffPoint = showStaff && Number.isFinite(Number(tracking.lat)) ? { lat: tracking.lat, lng: tracking.lng } : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      {!way.tracking ? (
        <section className="card card-pad grid content-start gap-6">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-fg"><span className="material-symbols-outlined text-[34px]">{way.icon}</span></span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-subtle">{way.label}</p>
              <p className="text-[24px] font-bold tracking-tight">{headline}</p>
              <p className="text-[13.5px] text-muted">{explainer}</p>
            </div>
            <span className={`ml-auto hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12px] font-medium sm:inline-flex ${connected ? 'text-success-fg' : 'text-warning-fg'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-success' : 'bg-warning'}`} />{connected ? 'Live' : 'Reconnecting'}
            </span>
          </div>
          <LifecycleRail status={status} fulfillment={mode} />
          <ol className="grid gap-3">
            {[...(tracking.statusHistory || [])].reverse().map((entry, index) => (
              <li key={`${entry.status}-${entry.at}-${index}`} className="flex items-center gap-3 text-[13.5px]">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${index === 0 ? 'bg-brand' : 'bg-line-strong'}`} />
                <span className="font-medium">{statusLabel(entry.status, mode)}</span>
                <span className="ml-auto text-subtle">{new Date(entry.at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
      <section className="card relative overflow-hidden p-0">
        <div className="h-[46vh] min-h-[320px] lg:h-[calc(100vh-220px)]">
          <TrackingMap staff={staffPoint} destination={tracking.destination} me={me} fitKey={`${bookingId}:${Boolean(staffPoint)}`} />
        </div>
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-[500] flex flex-wrap items-start justify-between gap-2">
          <div className="glass pointer-events-auto flex items-center gap-4 rounded-2xl border border-line px-4 py-2.5 shadow-card">
            <div>
              <p className="text-[11.5px] text-subtle">Status</p>
              <StatusBadge status={status} fulfillment={mode} className="mt-0.5" />
            </div>
            {status === 'En Route' && (
              <div className="border-l border-line pl-4">
                <p className="text-[11.5px] text-subtle">Arriving in</p>
                <p className="text-[18px] font-bold tabular-nums">{tracking.etaMinutes ? `${tracking.etaMinutes} min` : '—'}</p>
              </div>
            )}
          </div>
          <span className={`glass pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12px] font-medium ${connected ? 'text-success-fg' : 'text-warning-fg'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-success' : 'bg-warning'}`} />{connected ? 'Live' : 'Reconnecting'}
          </span>
        </div>
      </section>
      )}

      <aside className="grid gap-5">
        <section className="card card-pad">
          <p className="text-[13.5px] text-muted">{explainer}</p>
          <LifecycleRail status={status} fulfillment={mode} className="mt-5" />
          {tracking.stale && showStaff && <p className="mt-4 text-[12px] text-subtle">Location last updated {tracking.updatedAt ? new Date(tracking.updatedAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) : 'a while ago'}.</p>}
        </section>

        {showStaff ? (
          <section className="card card-pad">
            <div className="flex items-center gap-3">
              <Avatar name={staff.name} src={staff.avatar} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-subtle">{mode === 'delivery' ? 'Your rider' : 'Your staff member'}</p>
                <p className="truncate text-[16px] font-semibold">{staff.name}</p>
                <p className="truncate text-[12.5px] text-muted">{tracking.company?.name}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {phone ? <a className="btn btn-secondary" href={`tel:${phone.replace(/[^\d+]/g, '')}`}><span className="material-symbols-outlined">call</span>Call</a> : <button type="button" className="btn btn-secondary" disabled>No phone</button>}
              <button type="button" className="btn btn-secondary" onClick={() => navigate(ROUTES.chat, { state: { bookingId } })}><span className="material-symbols-outlined">chat</span>Message</button>
            </div>
          </section>
        ) : (
          <section className="card card-pad flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand-fg"><span className="material-symbols-outlined">storefront</span></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{tracking.company?.name}</p>
              <p className="text-[12.5px] text-muted">{status === 'Pending' ? (mode === 'onsite' ? 'Assigning staff' : 'Waiting for confirmation') : way.label}</p>
            </div>
            <button type="button" className="btn btn-secondary btn-icon" onClick={() => navigate(ROUTES.chat, { state: { bookingId } })} aria-label="Message company"><span className="material-symbols-outlined">chat</span></button>
          </section>
        )}

        <section className="card">
          <dl className="divide-y divide-line text-[13.5px]">
            <div className="flex justify-between gap-4 px-5 py-3"><dt className="text-muted">{way.addressLabel}</dt><dd className="text-right font-medium">{mode === 'remote' ? 'Online' : tracking.location}</dd></div>
            {tracking.scheduledAt && <div className="flex justify-between gap-4 px-5 py-3"><dt className="text-muted">Scheduled</dt><dd className="text-right font-medium">{new Date(tracking.scheduledAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</dd></div>}
            <div className="flex justify-between gap-4 px-5 py-3"><dt className="text-muted">Payment</dt><dd className="font-medium capitalize">{tracking.paymentMethod || 'cash'} · {tracking.paymentStatus || 'unpaid'}</dd></div>
            <div className="flex justify-between gap-4 px-5 py-3"><dt className="text-muted">Total</dt><dd className="text-[15px] font-bold tabular-nums">{formatCurrency(tracking.pricing?.finalTotal)}</dd></div>
          </dl>
        </section>

        <Alert>{error && tracking ? `Showing the last known status. ${error.message}` : ''}</Alert>

        <div className="grid gap-2">
          {['Completed', 'Paid'].includes(status) && <button type="button" className="btn btn-secondary" onClick={() => setInvoiceOpen(true)}><span className="material-symbols-outlined">receipt_long</span>View invoice</button>}
          {['Completed', 'Paid'].includes(status) && !reviewed && <button type="button" className="btn btn-primary" onClick={() => navigate(`${ROUTES.serviceReview}?bookingId=${bookingId}`, { state: { bookingId } })}><span className="material-symbols-outlined">star</span>{isOrder ? 'Rate this order' : 'Rate this job'}</button>}
          {['Pending', 'Assigned'].includes(status) && <button type="button" className="btn btn-danger" disabled={cancelling} onClick={cancel}>{cancelling ? 'Cancelling…' : isOrder ? 'Cancel order' : 'Cancel booking'}</button>}
        </div>
      </aside>
      <InvoiceModal bookingId={invoiceOpen ? bookingId : null} onClose={() => setInvoiceOpen(false)} />
    </div>
  );
}

export default LiveTracking;
