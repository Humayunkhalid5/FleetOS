import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import { Alert, LifecycleRail, Spinner } from '../../../components/ui';
import { formatCurrency } from '../../../utils/helpers';
import { readDraft, clearDraft, totals, slotLabel } from './bookingDraft';
import { fulfillmentOf } from '../../../constants/fulfillment';

const METHODS = [
  ['cash', 'payments', 'Cash', 'Pay in cash when you receive it. The business records it and you get an invoice.'],
  ['card', 'credit_card', 'Card', 'Pay securely online by card when the business has card checkout enabled.'],
];

function Row({ icon, label, children }) {
  return (
    <div className="flex gap-4 px-5 py-4 sm:px-6">
      <span className="material-symbols-outlined mt-0.5 text-[20px] text-subtle">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-subtle">{label}</p>
        <div className="mt-0.5 text-[14px] font-medium text-ink">{children}</div>
      </div>
    </div>
  );
}

function BookingSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useFeedback();
  const draft = location.state?.companyId ? location.state : readDraft();
  const [method, setMethod] = useState('cash');
  const [idempotencyKey] = useState(() => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!draft?.companyId || !draft?.service) navigate(ROUTES.companies, { replace: true }); }, [draft, navigate]);
  usePageChrome({ title: 'Review and confirm', subtitle: 'Check the details before the business receives it.', backTo: ROUTES.customizeBooking });
  if (!draft?.companyId || !draft?.service) return null;

  const materials = draft.materials || [];
  const mode = draft.fulfillment || 'onsite';
  const way = fulfillmentOf(mode);
  const isOrder = mode === 'delivery' || mode === 'pickup';
  const sum = totals(draft.servicePrice, materials, { quantity: draft.quantity || 1, fee: draft.deliveryFee || 0 });
  const when = new Date(`${draft.date}T${draft.time}:00`);
  const whenLabel = Number.isNaN(when.getTime()) ? 'Not scheduled' : `${when.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })} · ${way.whenLabel.toLowerCase()} around ${slotLabel(draft.time)}`;

  const confirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { booking } = await api.post('/bookings', {
        companyId: draft.companyId,
        serviceName: draft.service,
        fulfillment: mode,
        quantity: draft.quantity || 1,
        materials: materials.map((item) => ({ name: item.name, quantity: item.qty, unitPrice: item.price })),
        paymentMethod: method,
        scheduledAt: when.toISOString(),
        location: way.needsAddress ? draft.serviceLocation?.address : undefined,
        coordinates: way.needsAddress && draft.serviceLocation?.lat ? { lat: draft.serviceLocation.lat, lng: draft.serviceLocation.lng } : undefined,
        notes: draft.problemDetails,
        vehicle: { label: draft.service },
        idempotencyKey,
      });
      const bookingId = booking?._id || booking?.id;
      clearDraft();
      if (method === 'card') {
        try {
          const checkout = await api.post(`/payments/checkout/${bookingId}`, {});
          if (checkout?.checkoutUrl) { window.location.assign(checkout.checkoutUrl); return; }
        } catch (checkoutError) {
          toast.info(`${checkoutError.message} Your booking is confirmed — you can pay the company after the service.`, { title: 'Card checkout unavailable', duration: 7000 });
        }
      } else {
        toast.success(`${isOrder ? 'Order' : 'Booking'} ${booking?.reference || ''} sent to ${draft.companyName}.`, { title: isOrder ? 'Order placed' : 'Booking confirmed' });
      }
      navigate(`${ROUTES.liveTracking}?bookingId=${bookingId}`, { replace: true, state: { bookingId } });
    } catch (requestError) {
      setError(requestError.message || 'The booking could not be created.');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="grid gap-5">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">{isOrder ? 'Order details' : 'Booking details'}</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(ROUTES.customizeBooking, { state: { companyId: draft.companyId } })}><span className="material-symbols-outlined">edit</span>Edit</button>
          </div>
          <div className="divide-y divide-line">
            <Row icon="storefront" label="Business">{draft.companyName}</Row>
            <Row icon={draft.serviceKind === 'product' ? 'inventory_2' : 'handyman'} label={draft.serviceKind === 'product' ? 'Item' : 'Service'}>{(draft.quantity || 1) > 1 ? `${draft.quantity} × ` : ''}{draft.service}</Row>
            <Row icon={way.icon} label="How">{way.label}</Row>
            <Row icon="location_on" label={way.addressLabel}>{way.needsAddress ? <>{draft.serviceLocation?.address}{draft.serviceLocation?.lat && <span className="badge badge-success ml-2 align-middle">Exact location</span>}</> : mode === 'remote' ? 'Online, details in chat' : `${draft.companyName}${draft.businessLocation ? ` · ${draft.businessLocation}` : ''}`}</Row>
            <Row icon="event" label="When">{whenLabel}</Row>
            {draft.problemDetails && <Row icon="notes" label="Your notes"><p className="whitespace-pre-line font-normal text-muted">{draft.problemDetails}</p></Row>}
          </div>
        </section>

        <section className="card card-pad">
          <h2 className="card-title">Payment method</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {METHODS.map(([value, icon, title, text]) => (
              <button key={value} type="button" onClick={() => setMethod(value)} aria-pressed={method === value} className={`flex gap-3 rounded-2xl border p-4 text-left transition-colors ${method === value ? 'border-brand bg-brand-soft/50 ring-1 ring-brand' : 'border-line hover:border-line-strong'}`}>
                <span className={`material-symbols-outlined ${method === value ? 'text-brand-fg' : 'text-subtle'}`}>{icon}</span>
                <span><span className="block text-[14px] font-semibold">{title}</span><span className="mt-0.5 block text-[12.5px] text-muted">{text}</span></span>
              </button>
            ))}
          </div>
        </section>

        <section className="card card-pad">
          <h2 className="card-title">What happens next</h2>
          <p className="mt-1 text-[13.5px] text-muted">{mode === 'onsite' ? 'The business assigns staff, and you can follow every step live.' : mode === 'delivery' ? 'The business accepts your order and you can follow the delivery live.' : 'You see every update the moment the business makes it.'}</p>
          <LifecycleRail status="Pending" fulfillment={mode} className="mt-5" />
        </section>
      </div>

      <aside className="card overflow-hidden lg:sticky lg:top-24">
        <div className="border-b border-line p-5"><h2 className="card-title">Price summary</h2></div>
        <dl className="grid gap-2.5 p-5 text-[13.5px]">
          <div className="flex justify-between gap-3"><dt className="text-muted">{(draft.quantity || 1) > 1 ? `${draft.quantity} × ` : ''}{draft.service}</dt><dd className="font-medium tabular-nums">{formatCurrency(sum.service)}</dd></div>
          {materials.map((item) => <div key={item.id || item.name} className="flex justify-between gap-3"><dt className="truncate text-muted">{item.name} × {item.qty}</dt><dd className="font-medium tabular-nums">{formatCurrency(item.qty * item.price)}</dd></div>)}
          <div className="flex justify-between gap-3"><dt className="text-muted">Tax (8.5%)</dt><dd className="font-medium tabular-nums">{formatCurrency(sum.tax)}</dd></div>
          {mode === 'delivery' && <div className="flex justify-between gap-3"><dt className="text-muted">Delivery</dt><dd className="font-medium tabular-nums">{sum.fee ? formatCurrency(sum.fee) : 'Free'}</dd></div>}
          <div className="divider my-1" />
          <div className="flex items-baseline justify-between gap-3"><dt className="font-semibold">Total</dt><dd className="text-[22px] font-bold tabular-nums">{formatCurrency(sum.total)}</dd></div>
        </dl>
        <div className="grid gap-3 border-t border-line bg-sunken/40 p-5">
          <Alert>{error}</Alert>
          <button type="button" onClick={confirm} disabled={submitting} className="btn btn-primary btn-lg w-full">
            {submitting ? <><Spinner /> Confirming</> : isOrder ? 'Place order' : 'Confirm booking'}
          </button>
          <p className="text-center text-[12px] text-subtle">Prices come from the business's live catalogue. Cancel free until it is under way.</p>
        </div>
      </aside>
    </div>
  );
}

export default BookingSummary;
