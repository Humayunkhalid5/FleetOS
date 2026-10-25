import { useMemo } from 'react';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { DASHBOARD_KEY, DASHBOARD_EVENTS } from '../../../components/company/workspace';
import BarChart from '../../../components/ui/BarChart';
import { Alert, Avatar, EmptyState, Skeleton, StatCard } from '../../../components/ui';
import { downloadCsv, formatCurrency } from '../../../utils/helpers';

export default function CompanyAnalytics() {
  const { data, error, loading, refresh } = useLiveQuery(DASHBOARD_KEY, { events: DASHBOARD_EVENTS });
  const { data: paymentData } = useLiveQuery('/payments', { events: ['booking:updated'] });
  const { data: reviewData } = useLiveQuery('/reviews', { events: ['review:created'] });
  const metrics = data?.metrics || {};
  const counts = metrics.statusCounts || {};
  const payments = useMemo(() => (paymentData?.payments || []).filter((payment) => payment.status === 'recorded'), [paymentData]);
  const reviews = reviewData?.reviews || [];
  const average = payments.length ? payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) / payments.length : 0;
  const finished = (counts.Completed || 0) + (counts.Paid || 0);
  const decided = finished + (counts.Cancelled || 0);
  const completionRate = decided ? Math.round((finished / decided) * 100) : 0;
  const rating = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : 0;

  const topServices = useMemo(() => {
    const map = new Map();
    payments.forEach((payment) => {
      const name = payment.booking?.serviceSnapshot?.name || 'Other';
      const row = map.get(name) || { name, revenue: 0, jobs: 0 };
      row.revenue += Number(payment.amount || 0);
      row.jobs += 1;
      map.set(name, row);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [payments]);
  const topRevenue = Math.max(1, ...topServices.map((row) => row.revenue));
  const team = [...(data?.technicians || [])].sort((a, b) => (b.completedJobsCount || 0) - (a.completedJobsCount || 0)).slice(0, 6);

  const exportCsv = () => downloadCsv('fleetos-revenue.csv', [['Month', 'Recorded revenue (PKR)'], ...(data?.revenue || []).map((row) => [row.month, row.amount])]);

  usePageChrome({
    title: 'Analytics',
    subtitle: 'Calculated live from your saved bookings, payments and reviews.',
    actions: data && <button type="button" className="btn btn-secondary" onClick={exportCsv}><span className="material-symbols-outlined">download</span>Export</button>,
  });

  if (loading) return <div className="grid gap-5"><div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-[124px] rounded-2xl" />)}</div><Skeleton className="h-80 rounded-2xl" /></div>;
  if (error && !data) return <Alert onRetry={refresh}>{error.message}</Alert>;

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon="payments" label="Recorded revenue" value={formatCurrency(metrics.recordedRevenue)} tone="success" />
        <StatCard icon="receipt" label="Average job value" value={formatCurrency(Math.round(average))} hint={`${payments.length} paid jobs`} tone="brand" />
        <StatCard icon="task_alt" label="Completion rate" value={`${completionRate}%`} hint={`${finished} completed · ${counts.Cancelled || 0} cancelled`} tone="info" />
        <StatCard icon="star" label="Customer rating" value={rating ? rating.toFixed(1) : '—'} hint={`${reviews.length} reviews`} tone="warning" />
      </div>

      <section className="card card-pad">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="card-title">Revenue by month</h2><p className="text-[12.5px] text-subtle">Recorded payments</p></div>
          <p className="text-[22px] font-bold tabular-nums">{formatCurrency(metrics.recordedRevenue)}</p>
        </div>
        <div className="mt-6"><BarChart data={(data?.revenue || []).map((row) => ({ label: row.month, value: row.amount }))} format={formatCurrency} height={260} empty="Revenue appears once payments are recorded" /></div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <div className="card-header"><h2 className="card-title">Top services by revenue</h2></div>
          {topServices.length ? (
            <ul className="grid gap-4 p-5 sm:p-6">
              {topServices.map((row) => (
                <li key={row.name}>
                  <div className="flex items-baseline justify-between gap-3 text-[13.5px]"><span className="truncate font-medium">{row.name}</span><span className="shrink-0 font-semibold tabular-nums">{formatCurrency(row.revenue)}</span></div>
                  <div className="mt-1.5 flex items-center gap-2"><span className="h-2 flex-1 overflow-hidden rounded-full bg-sunken"><span className="block h-full rounded-full bg-brand" style={{ width: `${(row.revenue / topRevenue) * 100}%` }} /></span><span className="w-14 text-right text-[11.5px] text-subtle">{row.jobs} job{row.jobs === 1 ? '' : 's'}</span></div>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon="leaderboard" title="No paid jobs yet" />}
        </section>

        <section className="card">
          <div className="card-header"><h2 className="card-title">Team performance</h2></div>
          {team.length ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Name</th><th className="text-right">Completed</th><th className="text-right">Rating</th><th className="text-right">On-time</th></tr></thead>
                <tbody>
                  {team.map((person) => (
                    <tr key={person._id}>
                      <td><div className="flex items-center gap-2.5"><Avatar name={person.name} src={person.avatar} size={28} /><span className="font-medium">{person.name}</span></div></td>
                      <td className="text-right tabular-nums">{person.completedJobsCount || 0}</td>
                      <td className="text-right tabular-nums">{person.rating ? Number(person.rating).toFixed(1) : '—'}</td>
                      <td className="text-right tabular-nums">{person.onTimeRate ?? 100}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState icon="badge" title="No team members yet" />}
        </section>
      </div>
    </div>
  );
}
