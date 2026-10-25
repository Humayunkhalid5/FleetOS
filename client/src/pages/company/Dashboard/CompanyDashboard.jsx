import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useAuth } from '../../../hooks/useAuth';
import { DASHBOARD_KEY, DASHBOARD_EVENTS } from '../../../components/company/workspace';
import useBookingActions, { nextAction } from '../../../components/company/useBookingActions';
import { bookingFulfillment, fulfillmentOf } from '../../../constants/fulfillment';
import { StaffSelect } from '../Bookings/CompanyBookings';
import BarChart from '../../../components/ui/BarChart';
import { Alert, Avatar, EmptyState, Skeleton, StatCard, StatusBadge } from '../../../components/ui';
import { LIFECYCLE, statusTone } from '../../../components/ui/status';
import { formatCurrency, formatDateTime, getGreeting, timeAgo } from '../../../utils/helpers';

function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="card-header"><h2 className="card-title">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const actions = useBookingActions();
  const { data, error, loading, refresh } = useLiveQuery(DASHBOARD_KEY, { events: DASHBOARD_EVENTS, interval: 60000 });
  const workspace = data?.company?.workspace || {};
  const modules = { workforce: true, inventory: true, ...workspace.modules };
  const metrics = data?.metrics || {};
  const bookings = useMemo(() => (data?.bookings || []).filter((booking) => booking.serviceSnapshot?.category !== 'Inquiry'), [data]);
  const staff = data?.technicians || [];
  const pending = bookings.filter((booking) => booking.status === 'Pending');
  const active = bookings.filter((booking) => ['Assigned', 'En Route', 'Arrived', 'In Progress'].includes(booking.status));
  const awaitingPayment = bookings.filter((booking) => booking.status === 'Completed');
  const statusCounts = metrics.statusCounts || {};
  const totalJobs = Math.max(1, metrics.totalBookings || 0);
  const requestLabel = workspace.requestLabel || 'Requests';
  const staffLabel = workspace.workforceLabel || 'Staff';

  // Owners often register under the business name; greet them as a team then.
  const ownerName = String(user?.name || '');
  const firstName = ownerName.split(' ')[0];
  const greetName = !firstName || (data?.company?.name || '').startsWith(firstName) ? 'team' : firstName;

  usePageChrome({
    title: `${getGreeting()}, ${greetName}`,
    subtitle: `${data?.company?.name || 'Your workspace'} · live overview`,
    actions: data && <>
      <button type="button" className="btn btn-secondary" onClick={() => navigate('/company/bookings')}><span className="material-symbols-outlined">inbox</span>{requestLabel}</button>
      <button type="button" className="btn btn-primary" onClick={() => navigate('/company/dispatch')}><span className="material-symbols-outlined">psychology</span>Smart Dispatch</button>
    </>,
  });

  if (loading) {
    return (
      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-[124px] rounded-2xl" />)}</div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>
      </div>
    );
  }
  if (error && !data) return <Alert onRetry={refresh}>{error.message}</Alert>;

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon="account_balance_wallet" label="Recorded revenue" value={formatCurrency(metrics.recordedRevenue)} tone="success" onClick={() => navigate('/company/analytics')} />
        <StatCard icon="inbox" label={`New ${requestLabel.toLowerCase()}`} value={metrics.pendingDispatch || 0} hint={metrics.pendingDispatch ? 'Waiting for staff' : 'All dispatched'} tone={metrics.pendingDispatch ? 'warning' : 'brand'} onClick={() => navigate('/company/bookings')} />
        <StatCard icon="engineering" label="Jobs in progress" value={metrics.activeJobs || 0} hint={`${awaitingPayment.length} awaiting payment`} tone="info" onClick={() => navigate('/company/bookings')} />
        {modules.workforce
          ? <StatCard icon="badge" label={`${staffLabel} available`} value={`${metrics.availableTechnicians || 0}/${metrics.technicianTotal || 0}`} tone="violet" onClick={() => navigate('/company/technicians')} />
          : <StatCard icon="inventory_2" label="Low stock items" value={metrics.lowStock || 0} tone={metrics.lowStock ? 'warning' : 'violet'} onClick={() => navigate('/company/inventory')} />}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Needs your attention" action={<Link to="/company/bookings" className="link text-[13px]">View all</Link>}>
          {[...pending, ...awaitingPayment].length ? (
            <ul className="divide-y divide-line">
              {[...pending, ...awaitingPayment].slice(0, 6).map((booking) => (
                // Phones get a two-line title and a separate action row, so the
                // job and customer names are never cut down to a few letters.
                <li key={booking._id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-5 py-3.5 sm:px-6 md:flex md:flex-wrap md:items-center md:gap-3">
                  <Avatar name={booking.customerName} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[14px] font-semibold leading-5 md:truncate">{booking.serviceSnapshot?.name} <span className="font-normal text-subtle">· {booking.customerName}</span></p>
                    <p className="truncate text-[12.5px] text-subtle">{fulfillmentOf(bookingFulfillment(booking)).short} · {formatDateTime(booking.scheduledAt)} · received {timeAgo(booking.createdAt)}</p>
                  </div>
                  <div className="col-start-2 flex flex-wrap items-center gap-2 md:col-start-auto">
                    <StatusBadge status={booking.status} fulfillment={bookingFulfillment(booking)} />
                    {booking.status === 'Pending' && nextAction(booking, { staffManaged: modules.workforce !== false })
                      ? <button type="button" className="btn btn-primary btn-sm" disabled={actions.busy === booking._id} onClick={() => actions.advance(booking, { staffManaged: modules.workforce !== false })}>{nextAction(booking, { staffManaged: modules.workforce !== false }).label}</button>
                      : booking.status === 'Pending' && modules.workforce
                        ? <StaffSelect booking={booking} staff={staff} onAssign={actions.assign} disabled={actions.busy === booking._id} />
                        : booking.status === 'Completed' && <button type="button" className="btn btn-success btn-sm" disabled={actions.busy === booking._id} onClick={() => actions.recordPayment(booking)}>Record payment</button>}
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon="task_alt" title="You're all caught up">New bookings and jobs waiting for payment will show up here.</EmptyState>}
        </Panel>

        <Panel title="Revenue" action={<Link to="/company/analytics" className="link text-[13px]">Analytics</Link>}>
          <div className="p-5 sm:p-6">
            <p className="text-[26px] font-bold tracking-tight tabular-nums">{formatCurrency(metrics.recordedRevenue)}</p>
            <p className="text-[12.5px] text-subtle">Recorded payments, last 6 months</p>
            <div className="mt-5"><BarChart data={(data?.revenue || []).map((item) => ({ label: item.month, short: String(item.month).split(' ')[0], value: item.amount }))} format={formatCurrency} height={200} empty="Revenue appears once payments are recorded" /></div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Job pipeline">
          <ul className="grid gap-3 p-5 sm:p-6">
            {LIFECYCLE.map((status) => {
              const count = statusCounts[status] || 0;
              return (
                <li key={status} className="grid grid-cols-[100px_minmax(0,1fr)_32px] items-center gap-3 text-[13px]">
                  <span className="text-muted">{status}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-sunken"><span className={`block h-full rounded-full bg-${statusTone(status) === 'neutral' ? 'line-strong' : statusTone(status)}`} style={{ width: `${(count / totalJobs) * 100}%` }} /></span>
                  <span className="text-right font-semibold tabular-nums">{count}</span>
                </li>
              );
            })}
          </ul>
        </Panel>

        {modules.workforce && (
          <Panel title={staffLabel} action={<Link to="/company/technicians" className="link text-[13px]">Manage</Link>}>
            {staff.length ? (
              <ul className="divide-y divide-line">
                {staff.slice(0, 6).map((person) => (
                  <li key={person._id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                    <Avatar name={person.name} src={person.avatar} size={32} />
                    <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold">{person.name}</p><p className="text-[12px] text-subtle">{person.completedJobsCount || 0} jobs completed</p></div>
                    <StatusBadge status={person.status} />
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon="badge" title={`No ${staffLabel.toLowerCase()} yet`} action={<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/company/technicians')}>Add team</button>} />}
          </Panel>
        )}

        <Panel title={modules.inventory ? 'Low stock' : 'In progress'} action={<Link to={modules.inventory ? '/company/inventory' : '/company/bookings'} className="link text-[13px]">Open</Link>}>
          {modules.inventory ? ((data?.lowStock || []).length ? (
            <ul className="divide-y divide-line">
              {data.lowStock.map((item) => (
                <li key={item._id} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                  <div className="min-w-0"><p className="truncate text-[13.5px] font-semibold">{item.name}</p><p className="text-[12px] text-subtle">Reorder at {item.reorderLevel}</p></div>
                  <span className={`badge ${item.quantity <= 0 ? 'badge-danger' : 'badge-warning'}`}>{item.quantity} left</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon="inventory" title="Stock levels look healthy" />) : (active.length ? (
            <ul className="divide-y divide-line">{active.slice(0, 6).map((booking) => <li key={booking._id} className="flex items-center justify-between gap-3 px-5 py-3"><span className="truncate text-[13.5px] font-medium">{booking.serviceSnapshot?.name}</span><StatusBadge status={booking.status} /></li>)}</ul>
          ) : <EmptyState icon="engineering" title="No jobs in progress" />)}
        </Panel>
      </div>
    </div>
  );
}
