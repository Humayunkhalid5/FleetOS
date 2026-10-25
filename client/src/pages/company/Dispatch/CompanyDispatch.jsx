import { useMemo, useState } from 'react';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useWorkspace } from '../../../components/company/workspace';
import useBookingActions from '../../../components/company/useBookingActions';
import { Alert, Avatar, EmptyState, Skeleton, SkeletonRows, StatusBadge, Spinner } from '../../../components/ui';
import { formatCurrency, formatDateTime, timeAgo } from '../../../utils/helpers';
import { bookingFulfillment, fulfillmentOf } from '../../../constants/fulfillment';

function Meter({ label, value, display, tone = 'brand' }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px]"><span className="text-subtle">{label}</span><span className="font-semibold text-ink">{display}</span></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken"><span className={`block h-full rounded-full bg-${tone}`} style={{ width: `${Math.max(4, Math.min(100, Number(value) || 0))}%` }} /></div>
    </div>
  );
}

export default function CompanyDispatch() {
  const { workspace } = useWorkspace();
  const actions = useBookingActions();
  const { data, error, loading, refresh } = useLiveQuery('/bookings', { events: ['booking:created', 'booking:updated'] });
  // Smart Dispatch ranks people who travel: on-site visits and deliveries.
  const queue = useMemo(() => (data?.bookings || []).filter((booking) => ['Pending', 'Assigned'].includes(booking.status) && booking.serviceSnapshot?.category !== 'Inquiry' && fulfillmentOf(bookingFulfillment(booking)).tracking).sort((a, b) => (a.status === b.status ? new Date(a.scheduledAt) - new Date(b.scheduledAt) : a.status === 'Pending' ? -1 : 1)), [data]);
  const [selectedId, setSelectedId] = useState('');
  const selected = queue.find((booking) => booking._id === selectedId) || queue[0];

  if (selected && selected._id !== selectedId) setSelectedId(selected._id);

  const { data: recData, loading: recLoading, error: recError } = useLiveQuery(selected ? `/bookings/${selected._id}/recommendations` : null, { events: ['booking:updated', 'workspace:updated'], keepPrevious: false });
  const recommendations = recData?.recommendations || [];
  const staffLabel = workspace.workforceLabel || 'Staff';

  usePageChrome({ title: 'Smart Dispatch', subtitle: `Ranked ${staffLabel.toLowerCase()} for every open job — by skill match, distance, workload and rating.` });

  const dispatch = async (rec) => {
    const ok = await actions.assign(selected, { _id: rec.technicianId, name: rec.name });
    if (ok) setSelectedId('');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
      <section className="card overflow-hidden">
        <div className="card-header">
          <h2 className="card-title">Dispatch queue</h2>
          <span className="badge badge-brand">{queue.length}</span>
        </div>
        <Alert onRetry={refresh} className="m-4">{error && !data ? error.message : ''}</Alert>
        {loading ? <div className="p-5"><SkeletonRows rows={4} /></div> : queue.length ? (
          <ul className="max-h-[calc(100vh-260px)] divide-y divide-line overflow-y-auto">
            {queue.map((booking) => {
              const active = selected?._id === booking._id;
              return (
                <li key={booking._id}>
                  <button type="button" onClick={() => setSelectedId(booking._id)} aria-pressed={active} className={`relative w-full px-5 py-4 text-left transition-colors ${active ? 'bg-brand-soft/50' : 'hover:bg-sunken'}`}>
                    {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold">{booking.serviceSnapshot?.name}</p>
                        <p className="truncate text-[12.5px] text-muted">{booking.customerName} · <span className="font-mono">{booking.reference}</span></p>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="mt-2 flex items-center gap-3 text-[12px] text-subtle">
                      <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[15px]">schedule</span>{formatDateTime(booking.scheduledAt)}</span>
                      <span className="truncate">{booking.technician?.name ? `→ ${booking.technician.name}` : `Received ${timeAgo(booking.createdAt)}`}</span>
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState icon="task_alt" title="Queue is clear">Every booking has staff assigned.</EmptyState>}
      </section>

      <section className="grid gap-5">
        {selected ? (
          <>
            <div className="card card-pad">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[12px] text-subtle">{selected.reference}</p>
                  <h2 className="mt-1 text-[20px] font-bold tracking-tight">{selected.serviceSnapshot?.name}</h2>
                  <p className="mt-1 text-[13.5px] text-muted">{selected.customerName}{selected.customerPhone ? ` · ${selected.customerPhone}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-[18px] font-bold tabular-nums">{formatCurrency(selected.pricing?.finalTotal)}</p>
                  <p className="text-[12.5px] text-subtle">{formatDateTime(selected.scheduledAt)}</p>
                </div>
              </div>
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-sunken px-3 py-2.5 text-[13.5px]"><span className="material-symbols-outlined text-[18px] text-subtle">location_on</span>{selected.location}</p>
              {selected.notes && <p className="mt-2 rounded-xl border border-line px-3 py-2.5 text-[13.5px] text-muted"><b className="text-ink">Customer notes:</b> {selected.notes}</p>}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="section-title flex items-center gap-2"><span className="material-symbols-outlined icon-fill text-brand">auto_awesome</span>Recommended {staffLabel.toLowerCase()}</h3>
              {recLoading && <span className="flex items-center gap-2 text-[12.5px] text-subtle"><Spinner className="h-3.5 w-3.5" />Scoring</span>}
            </div>
            <Alert>{recError?.message}</Alert>
            {recLoading && !recommendations.length ? <div className="grid gap-4">{[0, 1].map((key) => <Skeleton key={key} className="h-48 rounded-2xl" />)}</div> : recommendations.length ? (
              <div className="grid gap-4">
                {recommendations.map((rec, rank) => (
                  <article key={rec.technicianId} className={`card card-pad ${rank === 0 ? 'border-brand-line ring-1 ring-brand/30' : ''}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={rec.name} size={46} />
                        <div>
                          <div className="flex items-center gap-2"><p className="text-[15.5px] font-semibold">{rec.name}</p>{rank === 0 && <span className="badge badge-brand"><span className="material-symbols-outlined">workspace_premium</span>Best match</span>}</div>
                          <p className="text-[12.5px] text-muted">{rec.role} · ★ {Number(rec.rating || 0).toFixed(1)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[28px] font-bold leading-none tabular-nums text-brand-fg">{rec.overallScore}</p>
                        <p className="text-[11.5px] text-subtle">match score</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Meter label="Skill match" value={rec.breakdown?.skillMatchScore} display={`${rec.breakdown?.skillMatchScore ?? 0}%`} />
                      <Meter label="Distance" value={100 - Math.min(100, Number(rec.distanceKm || 0) * 4)} display={`${rec.distanceKm} km · ${rec.etaMinutes} min`} tone="accent" />
                      <Meter label="Workload" value={rec.breakdown?.workloadLevel === 'Low' ? 85 : rec.breakdown?.workloadLevel === 'Medium' ? 55 : 25} display={`${rec.breakdown?.workloadLevel} (${rec.activeJobs})`} tone={rec.breakdown?.workloadLevel === 'Low' ? 'success' : 'warning'} />
                      <Meter label="Rating" value={rec.breakdown?.ratingScore} display={`${rec.breakdown?.ratingScore ?? 0}%`} tone="violet" />
                    </div>
                    {rec.explanation && <p className="mt-4 text-[13px] text-muted">{rec.explanation}</p>}
                    <div className="mt-4 flex justify-end">
                      <button type="button" disabled={actions.busy === selected._id || String(selected.technician?._id) === String(rec.technicianId)} onClick={() => dispatch(rec)} className={`btn ${rank === 0 ? 'btn-primary' : 'btn-secondary'}`}>
                        {String(selected.technician?._id) === String(rec.technicianId) ? 'Currently assigned' : <><span className="material-symbols-outlined">send</span>Dispatch {rec.name.split(' ')[0]}</>}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="card"><EmptyState icon="person_off" title={`No ${staffLabel.toLowerCase()} available`}>Set someone to Available on the {staffLabel} page to dispatch this job.</EmptyState></div>}
          </>
        ) : !loading && <div className="card"><EmptyState icon="touch_app" title="Nothing to dispatch">When a customer books, the job appears in the queue with ranked recommendations.</EmptyState></div>}
      </section>
    </div>
  );
}
