import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useWorkspace } from '../../../components/company/workspace';
import BookingDrawer from '../../../components/company/BookingDrawer';
import useBookingActions, { nextAction } from '../../../components/company/useBookingActions';
import { bookingFulfillment, fulfillmentOf } from '../../../constants/fulfillment';
import { Alert, Avatar, EmptyState, SkeletonRows, StatusBadge, Tabs, Spinner } from '../../../components/ui';
import { downloadCsv, formatCurrency, formatDateTime } from '../../../utils/helpers';

const GROUPS = {
  open: ['Pending'],
  active: ['Assigned', 'En Route', 'Arrived', 'In Progress'],
  completed: ['Completed'],
  paid: ['Paid'],
  cancelled: ['Cancelled'],
};

export function StaffSelect({ booking, staff, onAssign, disabled }) {
  const options = staff.filter((person) => person.status === 'Available' || person._id === booking.technician?._id);
  return (
    <select
      className="select input-sm h-9 w-full min-w-[140px] max-w-[170px] text-[13px]"
      value={booking.technician?._id || ''}
      disabled={disabled || !['Pending', 'Assigned'].includes(booking.status)}
      onChange={(event) => { const person = staff.find((item) => item._id === event.target.value); if (person) onAssign(booking, person); }}
      aria-label={`Assign staff to ${booking.reference}`}
    >
      <option value="">{options.length ? 'Assign staff…' : 'No one available'}</option>
      {options.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
    </select>
  );
}

/** How the customer gets it: a small icon + word shown next to each job. */
export function FulfillmentTag({ booking }) {
  const way = fulfillmentOf(bookingFulfillment(booking));
  return <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-subtle"><span className="material-symbols-outlined text-[15px]">{way.icon}</span>{way.short}</span>;
}

export function RowActions({ booking, actions, onOpen, staffManaged = true }) {
  const next = nextAction(booking, { staffManaged });
  const busy = actions.busy === booking._id;
  return (
    <div className="flex items-center justify-end gap-1.5">
      {busy && <Spinner className="h-4 w-4 text-brand" />}
      {next && <button type="button" disabled={busy} onClick={() => actions.advance(booking, { staffManaged })} className="btn btn-primary btn-sm">{next.label}</button>}
      {booking.status === 'Completed' && <button type="button" disabled={busy} onClick={() => actions.recordPayment(booking)} className="btn btn-success btn-sm"><span className="material-symbols-outlined">payments</span>Record payment</button>}
      <button type="button" onClick={() => onOpen(booking)} className="btn btn-ghost btn-icon btn-sm" aria-label="Details"><span className="material-symbols-outlined">open_in_full</span></button>
    </div>
  );
}

export default function CompanyBookings() {
  const navigate = useNavigate();
  const { workspace, modules } = useWorkspace();
  const staffManaged = modules.workforce !== false;
  const [query, setQuery] = useState('');
  const [chosenTab, setChosenTab] = useState(null);
  // Jobs you just acted on stay in view until you switch tabs, so a row never
  // vanishes mid-task when its status moves it to another tab.
  const [touched, setTouched] = useState(() => new Set());
  const setTab = (value) => { setChosenTab(value); setTouched(new Set()); };
  const [openId, setOpenId] = useState('');
  const baseActions = useBookingActions();
  const touch = (booking) => setTouched((current) => new Set(current).add(booking._id));
  const actions = {
    ...baseActions,
    assign: (booking, person) => { touch(booking); return baseActions.assign(booking, person); },
    advance: (booking) => { touch(booking); return baseActions.advance(booking, { staffManaged }); },
    recordPayment: (booking) => { touch(booking); return baseActions.recordPayment(booking); },
  };
  const { data, error, loading, refresh } = useLiveQuery('/bookings', { events: ['booking:created', 'booking:updated'] });
  const { data: staffData } = useLiveQuery('/technicians', { events: ['booking:updated', 'workspace:updated'] });
  const staff = staffData?.technicians || [];
  const label = workspace.requestLabel || 'Requests';

  const all = useMemo(() => data?.bookings || [], [data]);
  const jobs = all.filter((booking) => booking.serviceSnapshot?.category !== 'Inquiry');
  const inquiries = all.filter((booking) => booking.serviceSnapshot?.category === 'Inquiry');
  const counts = Object.fromEntries(Object.entries(GROUPS).map(([key, statuses]) => [key, jobs.filter((booking) => statuses.includes(booking.status)).length]));
  // Open on the first tab that has work in it, unless the user picked one.
  const tab = chosenTab || ['open', 'active', 'completed'].find((key) => counts[key] > 0) || 'all';
  const source = tab === 'inquiries' ? inquiries : tab === 'all' ? jobs : jobs.filter((booking) => GROUPS[tab].includes(booking.status) || touched.has(booking._id));
  const q = query.trim().toLowerCase();
  const list = q ? source.filter((booking) => [booking.reference, booking.customerName, booking.serviceSnapshot?.name, booking.location, booking.technician?.name].some((value) => String(value || '').toLowerCase().includes(q))) : source;
  const open = all.find((booking) => booking._id === openId);

  const exportCsv = () => downloadCsv(`fleetos-${label.toLowerCase().replace(/\W+/g, '-')}.csv`, [
    ['Reference', 'Customer', 'Phone', 'Item / service', 'Quantity', 'How', 'Scheduled', 'Address', 'Staff', 'Status', 'Payment', 'Total (PKR)'],
    ...jobs.map((booking) => [booking.reference, booking.customerName, booking.customerPhone, booking.serviceSnapshot?.name, booking.quantity || 1, fulfillmentOf(bookingFulfillment(booking)).label, formatDateTime(booking.scheduledAt), booking.location, booking.technician?.name || '', booking.status, booking.paymentStatus, booking.pricing?.finalTotal]),
  ]);

  usePageChrome({
    title: label,
    subtitle: 'Accept, assign and move each order or job forward.',
    search: query,
    onSearch: setQuery,
    actions: <>
      <button type="button" className="btn btn-secondary" onClick={exportCsv}><span className="material-symbols-outlined">download</span>Export</button>
      {staffManaged && workspace.modules?.tracking !== false && <button type="button" className="btn btn-primary" onClick={() => navigate('/company/dispatch')}><span className="material-symbols-outlined">psychology</span>Smart Dispatch</button>}
    </>,
  });

  return (
    <div className="grid gap-5">
      <Tabs value={tab} onChange={setTab} tabs={[['open', 'New', counts.open], ['active', 'In progress', counts.active], ['completed', 'Awaiting payment', counts.completed], ['paid', 'Paid', counts.paid], ['cancelled', 'Cancelled', counts.cancelled], ['all', 'All', jobs.length], ['inquiries', 'Inquiries', inquiries.length]]} />
      <Alert onRetry={refresh}>{error && !data ? error.message : ''}</Alert>

      <section className="card overflow-hidden">
        {loading ? <div className="p-5"><SkeletonRows rows={6} /></div> : list.length ? (
          <>
          <ul className="divide-y divide-line md:hidden">
            {list.map((booking) => (
              <li key={booking._id} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 p-4">
                <button type="button" onClick={() => setOpenId(booking._id)} className="flex items-start gap-3 text-left">
                  <Avatar name={booking.customerName} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{booking.customerName}</span>
                    <span className="block truncate text-[12.5px] text-muted">{(booking.quantity || 1) > 1 ? `${booking.quantity} × ` : ''}{booking.serviceSnapshot?.name}</span>
                    <FulfillmentTag booking={booking} />
                    <span className="block text-[12px] text-subtle">{formatDateTime(booking.scheduledAt)}</span>
                  </span>
                  <span className="grid shrink-0 justify-items-end gap-1.5">
                    <span className="whitespace-nowrap font-semibold tabular-nums">{formatCurrency(booking.pricing?.finalTotal)}</span>
                    <StatusBadge status={booking.status} fulfillment={bookingFulfillment(booking)} />
                  </span>
                </button>
                {tab === 'inquiries' ? (
                  <button type="button" className="btn btn-soft btn-sm justify-self-end" onClick={() => navigate('/company/chat', { state: { bookingId: booking._id } })}><span className="material-symbols-outlined">chat</span>Reply</button>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    {staffManaged ? <StaffSelect booking={booking} staff={staff} onAssign={actions.assign} disabled={actions.busy === booking._id} /> : <span />}
                    <RowActions booking={booking} actions={actions} staffManaged={staffManaged} onOpen={(item) => setOpenId(item._id)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="table min-w-[780px]">
              <thead><tr><th>Customer</th><th>Item / service</th><th className="hidden 2xl:table-cell">Scheduled</th><th>Status</th>{staffManaged && <th>Staff</th>}<th className="text-right">Total</th><th className="text-right">Action</th></tr></thead>
              <tbody>
                {list.map((booking) => (
                  <tr key={booking._id}>
                    <td>
                      <button type="button" onClick={() => setOpenId(booking._id)} className="flex items-center gap-3 text-left">
                        <Avatar name={booking.customerName} size={34} />
                        <span className="min-w-0 whitespace-nowrap"><span className="block font-semibold hover:text-brand-fg">{booking.customerName}</span><span className="font-mono text-[11.5px] text-subtle">{booking.reference}</span><span className="block text-[11.5px] text-subtle 2xl:hidden">{formatDateTime(booking.scheduledAt)}</span></span>
                      </button>
                    </td>
                    <td><p className="max-w-[240px] truncate font-medium" title={booking.serviceSnapshot?.name}>{(booking.quantity || 1) > 1 ? `${booking.quantity} × ` : ''}{booking.serviceSnapshot?.name}</p><p className="flex max-w-[240px] items-center gap-2 truncate text-[12px] text-subtle"><FulfillmentTag booking={booking} />{fulfillmentOf(bookingFulfillment(booking)).needsAddress && <span className="truncate">{booking.location}</span>}</p></td>
                    <td className="hidden whitespace-nowrap text-muted 2xl:table-cell">{formatDateTime(booking.scheduledAt)}</td>
                    <td><StatusBadge status={booking.status} fulfillment={bookingFulfillment(booking)} /></td>
                    {staffManaged && <td>{tab === 'inquiries' ? <span className="text-subtle">—</span> : <StaffSelect booking={booking} staff={staff} onAssign={actions.assign} disabled={actions.busy === booking._id} />}</td>}
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatCurrency(booking.pricing?.finalTotal)}</td>
                    <td>{tab === 'inquiries' ? <div className="flex justify-end"><button type="button" className="btn btn-soft btn-sm" onClick={() => navigate('/company/chat', { state: { bookingId: booking._id } })}><span className="material-symbols-outlined">chat</span>Reply</button></div> : <RowActions booking={booking} actions={actions} staffManaged={staffManaged} onOpen={(item) => setOpenId(item._id)} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <EmptyState icon={tab === 'open' ? 'inbox' : 'search_off'} title={q ? 'No matches' : tab === 'open' ? 'Nothing new' : 'Nothing here yet'}>
            {q ? 'Try a customer name, reference or item.' : tab === 'open' ? 'New orders and bookings will show up here.' : 'Items move here automatically as their status changes.'}
          </EmptyState>
        )}
      </section>

      <BookingDrawer
        booking={open}
        onClose={() => setOpenId('')}
        actions={open && open.status !== 'Cancelled' && open.status !== 'Paid' && open.serviceSnapshot?.category !== 'Inquiry' && (
          <>
            <button type="button" className="btn btn-danger" onClick={async () => { if (await actions.cancel(open)) setOpenId(''); }}>{open.status === 'Pending' ? 'Decline' : 'Cancel'}</button>
            {nextAction(open, { staffManaged }) && <button type="button" className="btn btn-primary" onClick={() => actions.advance(open)}>{nextAction(open, { staffManaged }).label}</button>}
            {open.status === 'Completed' && <button type="button" className="btn btn-primary" onClick={() => actions.recordPayment(open)}>Record payment</button>}
          </>
        )}
      />
    </div>
  );
}
