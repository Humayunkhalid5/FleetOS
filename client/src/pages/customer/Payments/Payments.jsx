import { useState } from 'react';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { Alert, EmptyState, SkeletonRows, StatCard, StatusBadge } from '../../../components/ui';
import InvoiceModal from '../../../components/common/InvoiceModal';
import { downloadCsv, formatCurrency, formatDate } from '../../../utils/helpers';

function Payments() {
  const { data, error, loading, refresh } = useLiveQuery('/payments', { events: ['booking:updated'] });
  const [invoiceFor, setInvoiceFor] = useState(null);
  const payments = data?.payments || [];
  const recorded = payments.filter((payment) => payment.status === 'recorded');
  const total = recorded.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const last = recorded[0];

  const exportCsv = () => downloadCsv('fleetos-payments.csv', [
    ['Receipt', 'Booking', 'Company', 'Method', 'Status', 'Amount (PKR)', 'Date'],
    ...payments.map((payment) => [payment.reference, payment.booking?.reference, payment.company?.name, payment.method, payment.status, payment.amount, formatDate(payment.recordedAt || payment.createdAt)]),
  ]);

  usePageChrome({
    title: 'Payments',
    subtitle: 'Receipts and invoices for completed work.',
    actions: payments.length > 0 && <button type="button" className="btn btn-secondary" onClick={exportCsv}><span className="material-symbols-outlined">download</span>Export CSV</button>,
  });

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <StatCard icon="account_balance_wallet" label="Total paid" value={formatCurrency(total)} tone="success" />
        <StatCard icon="receipt_long" label="Receipts" value={recorded.length} tone="brand" />
        <StatCard icon="schedule" label="Last payment" value={last ? formatDate(last.recordedAt || last.createdAt, { day: 'numeric', month: 'short' }) : '—'} hint={last?.company?.name} tone="info" />
      </div>
      <Alert onRetry={refresh}>{error && !data ? error.message : ''}</Alert>
      <section className="card overflow-hidden">
        <div className="card-header"><h2 className="card-title">Payment history</h2></div>
        {loading ? <div className="p-5"><SkeletonRows rows={4} /></div> : payments.length ? (
          <div className="overflow-x-auto">
            <table className="table min-w-[760px]">
              <thead><tr><th>Receipt</th><th>Company</th><th>Booking</th><th>Method</th><th>Status</th><th>Date</th><th className="text-right">Amount</th><th /></tr></thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td className="whitespace-nowrap"><span className="ref">{payment.reference}</span></td>
                    <td className="font-medium">{payment.company?.name}</td>
                    <td className="whitespace-nowrap text-muted">{payment.booking?.reference}</td>
                    <td className="capitalize text-muted">{payment.method}</td>
                    <td><StatusBadge status={payment.status === 'recorded' ? 'Recorded' : payment.status} /></td>
                    <td className="text-muted">{formatDate(payment.recordedAt || payment.createdAt)}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatCurrency(payment.amount)}</td>
                    <td className="text-right">{payment.booking?._id && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setInvoiceFor(payment.booking._id)}>Invoice</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon="receipt_long" title="No payments yet">Receipts appear here as soon as a company records payment for a completed job.</EmptyState>}
      </section>
      <InvoiceModal bookingId={invoiceFor} onClose={() => setInvoiceFor(null)} />
    </div>
  );
}

export default Payments;
