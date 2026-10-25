import { useLiveQuery } from '../../hooks/useLiveQuery';
import { Modal, Alert, Skeleton, StatusBadge } from '../ui';
import { LogoMark } from '../ui/Logo';
import { formatCurrency } from '../../utils/helpers';

/** Issue date, falling back to today for an invoice that has no timestamp yet. */
function invoiceDate(createdAt) {
  return new Date(createdAt || Date.now()).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function InvoiceModal({ bookingId, onClose }) {
  const { data, error, loading } = useLiveQuery(bookingId ? `/invoices/booking/${bookingId}` : null, { events: ['booking:updated'], keepPrevious: false });
  const invoice = data?.invoice;

  return (
    <Modal
      open={Boolean(bookingId)}
      onClose={onClose}
      size="lg"
      title="Invoice"
      description={invoice?.invoiceNumber}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-primary" disabled={!invoice} onClick={() => window.print()}><span className="material-symbols-outlined">print</span>Print or save PDF</button>
        </>
      )}
    >
      {loading ? (
        <div className="grid gap-3"><Skeleton className="h-24" /><Skeleton className="h-40" /></div>
      ) : error ? (
        <Alert>{error.status === 404 ? 'The invoice is issued once the job is completed.' : error.message}</Alert>
      ) : invoice ? (
        <div className="printable grid gap-5 text-[13.5px]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <LogoMark size={30} />
              <div>
                <p className="text-[16px] font-bold">{invoice.company?.name}</p>
                <p className="text-[12.5px] text-subtle">{[invoice.company?.city, invoice.company?.phone].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[12px] text-subtle">{invoice.invoiceNumber}</p>
              <p className="text-[12.5px] text-subtle">{invoiceDate(invoice.createdAt)}</p>
              <StatusBadge status={invoice.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'} className="mt-2" />
            </div>
          </div>

          <div className="well grid gap-1 p-4">
            <p className="text-[12px] text-subtle">Billed to</p>
            <p className="font-semibold">{invoice.customerName}</p>
            <p className="text-[12.5px] text-muted">{invoice.customerEmail || invoice.customerPhone}</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-line">
            <table className="table">
              <thead><tr><th>Description</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                <tr><td><p className="font-medium">{invoice.serviceName}</p><p className="text-[12px] text-subtle">Service labour</p></td><td className="text-right tabular-nums">{formatCurrency(invoice.laborFee)}</td></tr>
                {invoice.materialsCost > 0 && <tr><td>Materials and parts</td><td className="text-right tabular-nums">{formatCurrency(invoice.materialsCost)}</td></tr>}
                {invoice.travelFee > 0 && <tr><td>Travel and dispatch</td><td className="text-right tabular-nums">{formatCurrency(invoice.travelFee)}</td></tr>}
              </tbody>
            </table>
          </div>

          <dl className="ml-auto grid w-full max-w-xs gap-2">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatCurrency(invoice.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Tax (8.5%)</dt><dd className="tabular-nums">{formatCurrency(invoice.taxAmount)}</dd></div>
            {invoice.discountAmount > 0 && <div className="flex justify-between text-success-fg"><dt>Discount</dt><dd className="tabular-nums">−{formatCurrency(invoice.discountAmount)}</dd></div>}
            <div className="divider" />
            <div className="flex justify-between text-[16px] font-bold"><dt>Total</dt><dd className="tabular-nums">{formatCurrency(invoice.netTotal)}</dd></div>
          </dl>
          <p className="border-t border-line pt-4 text-center text-[12px] text-subtle">Issued through FleetOS on behalf of {invoice.company?.name}.</p>
        </div>
      ) : null}
    </Modal>
  );
}
