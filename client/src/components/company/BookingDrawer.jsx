import { useNavigate } from 'react-router-dom';
import { Modal, LifecycleRail, StatusBadge } from '../ui';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { bookingFulfillment, fulfillmentOf, statusLabel } from '../../constants/fulfillment';

/** Full booking details for company staff: notes, items, history. */
export default function BookingDrawer({ booking, onClose, actions }) {
  const navigate = useNavigate();
  if (!booking) return null;
  const history = [...(booking.statusHistory || [])].reverse();
  const mode = bookingFulfillment(booking);
  const way = fulfillmentOf(mode);
  return (
    <Modal open={Boolean(booking)} onClose={onClose} size="lg" title={booking.serviceSnapshot?.name} description={`${booking.reference} · ${booking.customerName}`}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/company/chat', { state: { bookingId: booking._id } })}><span className="material-symbols-outlined">chat</span>Message customer</button>
        {actions}
      </>}>
      <div className="grid gap-5">
        <div className="flex items-center justify-between gap-3"><span className="flex flex-wrap items-center gap-2"><StatusBadge status={booking.status} fulfillment={mode} /><span className="badge badge-neutral"><span className="material-symbols-outlined">{way.icon}</span>{way.label}</span></span><span className="text-[18px] font-bold tabular-nums">{formatCurrency(booking.pricing?.finalTotal)}</span></div>
        {booking.status !== 'Cancelled' && <LifecycleRail status={booking.status} fulfillment={mode} />}
        <dl className="grid gap-3 rounded-2xl border border-line p-4 text-[13.5px] sm:grid-cols-2">
          <div><dt className="text-subtle">Customer</dt><dd className="font-medium">{booking.customerName}</dd><dd className="text-muted">{booking.customerPhone || booking.customerEmail || '—'}</dd></div>
          <div><dt className="text-subtle">Scheduled</dt><dd className="font-medium">{formatDateTime(booking.scheduledAt)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-subtle">{way.addressLabel}</dt><dd className="font-medium">{mode === 'remote' ? 'Online' : booking.location}</dd></div>
          <div><dt className="text-subtle">Assigned staff</dt><dd className="font-medium">{booking.technician?.name || 'Not assigned'}</dd></div>
          <div><dt className="text-subtle">Payment</dt><dd className="font-medium capitalize">{booking.paymentMethod} · {booking.paymentStatus}</dd></div>
        </dl>
        {booking.notes && <div className="rounded-2xl bg-sunken p-4"><p className="text-[12.5px] font-semibold text-muted">Customer notes</p><p className="mt-1 whitespace-pre-line text-[14px]">{booking.notes}</p></div>}
        {booking.cancellationReason && <div className="rounded-2xl border border-danger-line bg-danger-soft p-4 text-[13.5px] text-danger-fg"><b>Cancelled:</b> {booking.cancellationReason}</div>}
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="table">
            <thead><tr><th>Item</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              <tr><td>{(booking.quantity || 1) > 1 ? `${booking.quantity} × ` : ''}{booking.serviceSnapshot?.name}</td><td className="text-right tabular-nums">{formatCurrency(booking.pricing?.serviceTotal)}</td></tr>
              {(booking.materials || []).map((item, index) => <tr key={`${item.name}-${index}`}><td>{item.name} × {item.quantity}</td><td className="text-right tabular-nums">{formatCurrency(item.quantity * item.unitPrice)}</td></tr>)}
              <tr><td className="text-muted">Tax</td><td className="text-right tabular-nums">{formatCurrency(booking.pricing?.tax)}</td></tr>
              {Number(booking.pricing?.fee) > 0 && <tr><td className="text-muted">Delivery fee</td><td className="text-right tabular-nums">{formatCurrency(booking.pricing.fee)}</td></tr>}
            </tbody>
          </table>
        </div>
        {history.length > 0 && (
          <div>
            <p className="mb-3 text-[13px] font-semibold text-muted">Timeline</p>
            <ol className="relative grid gap-4 border-l border-line pl-5">
              {history.map((entry, index) => (
                <li key={`${entry.status}-${entry.at}-${index}`} className="relative">
                  <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-surface ${index === 0 ? 'bg-brand' : 'bg-line-strong'}`} />
                  <p className="text-[13.5px] font-semibold">{statusLabel(entry.status, mode)} <span className="font-normal text-subtle">· {entry.byRole}</span></p>
                  <p className="text-[12.5px] text-subtle">{formatDateTime(entry.at)}{entry.note ? ` — ${entry.note}` : ''}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Modal>
  );
}
