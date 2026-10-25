import { useEffect, useRef, useState } from 'react';
import { StatusBadge, Avatar } from '../ui';

const JOB = { ref: 'FOS-2481', service: 'AC installation · 2 units', customer: 'Ayesha Karim', area: 'Gulberg III, Lahore', staff: 'Imran Ali', rating: '4.9', total: 'PKR 18,500' };

// [status, icon, activity text, duration in 250 ms ticks]
const STEPS = [
  ['Pending', 'schedule', 'Booking received', 6],
  ['Assigned', 'assignment_ind', `${JOB.staff} assigned`, 6],
  ['En Route', 'local_shipping', 'Technician on the way', 16],
  ['Arrived', 'where_to_vote', `Arrived in ${JOB.area.split(',')[0]}`, 6],
  ['In Progress', 'construction', 'Installation started', 8],
  ['Completed', 'task_alt', 'Work completed', 6],
  ['Paid', 'payments', `${JOB.total} paid · invoice sent`, 14],
];
const CYCLE = STEPS.reduce((sum, step) => sum + step[3], 0);
const ETA_MINUTES = 14;

function locate(tick) {
  let start = 0;
  for (let index = 0; index < STEPS.length; index += 1) {
    if (tick < start + STEPS[index][3]) return { index, progress: (tick - start) / STEPS[index][3] };
    start += STEPS[index][3];
  }
  return { index: STEPS.length - 1, progress: 1 };
}

// Cubic Bézier used for the route preview (viewBox 0 0 320 64).
const P = [[22, 44], [110, 4], [190, 66], [298, 22]];
function pointAt(t) {
  const u = 1 - t;
  const [a, b, c, d] = P;
  return [0, 1].map((axis) => u * u * u * a[axis] + 3 * u * u * t * b[axis] + 3 * u * t * t * c[axis] + t * t * t * d[axis]);
}
const ROUTE = `M${P[0]} C${P[1]} ${P[2]} ${P[3]}`;

function clock(offsetMinutes) {
  const date = new Date(Date.now() - offsetMinutes * 60000);
  return date.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });
}

/** Sample booking that walks the whole job lifecycle on a loop. */
export default function LiveJobCard({ className = '' }) {
  const cardRef = useRef(null);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [tick, setTick] = useState(() => (reducedMotion ? 30 : 0));

  useEffect(() => {
    if (reducedMotion) return undefined;
    const id = window.setInterval(() => {
      if (!document.hidden) setTick((value) => (value + 1) % CYCLE);
    }, 250);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const { index, progress } = locate(tick);
  const status = STEPS[index][0];
  const travel = index < 2 ? 0 : index === 2 ? progress : 1;
  const [vanX, vanY] = pointAt(travel);
  const eta = index < 2 ? null : index === 2 ? Math.max(1, Math.ceil(ETA_MINUTES * (1 - progress))) : 0;
  const overall = Math.round(((index + (index === STEPS.length - 1 ? 1 : progress)) / STEPS.length) * 100);
  const feed = STEPS.slice(0, index + 1).map(([, icon, text], position) => ({ icon, text, at: clock((index - position) * 3) })).reverse().slice(0, 2);

  // Pointer tilt, written straight to CSS variables (no re-render).
  const onPointerMove = (event) => {
    if (reducedMotion || event.pointerType === 'touch') return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty('--ry', `${(x - 0.5) * 9}deg`);
    card.style.setProperty('--rx', `${(0.5 - y) * 7}deg`);
    card.style.setProperty('--mx', `${x * 100}%`);
    card.style.setProperty('--my', `${y * 100}%`);
  };
  const onPointerLeave = () => {
    const card = cardRef.current;
    ['--rx', '--ry'].forEach((name) => card.style.setProperty(name, '0deg'));
  };

  return (
    <article ref={cardRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className={`job-card ${className}`} aria-label="Sample booking moving through the FleetOS job lifecycle">
      <header className="flex items-center justify-between gap-3 border-b border-line/80 px-5 py-3">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-success-fg">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
          Live job
        </span>
        <span className="flex items-center gap-2">
          <span className="ref">{JOB.ref}</span>
          <span className="text-[12px] tabular-nums text-subtle">{clock(0)}</span>
        </span>
      </header>

      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[16.5px] font-semibold text-ink">{JOB.service}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-muted"><span className="material-symbols-outlined text-[15px]">location_on</span>{JOB.customer} · {JOB.area}</p>
          </div>
          <span key={status} className="shrink-0 animate-scale-in"><StatusBadge status={status} /></span>
        </div>

        <ol className="job-steps" aria-label={`Step ${index + 1} of ${STEPS.length}: ${status}`}>
          {STEPS.map(([step, icon], position) => (
            <li key={step} className={position < index ? 'is-done' : position === index ? 'is-current' : ''} title={step}>
              <span className="material-symbols-outlined">{position < index ? 'check' : icon}</span>
            </li>
          ))}
          <span className="job-steps__track" aria-hidden="true"><i style={{ width: `${(index / (STEPS.length - 1)) * 100}%` }} /></span>
        </ol>

        <div className="job-route" aria-hidden="true">
          <svg viewBox="0 0 320 64" preserveAspectRatio="none">
            <path d={ROUTE} className="job-route__base" />
            <path d={ROUTE} className="job-route__done" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - travel} />
          </svg>
          <span className="job-route__end job-route__end--start" style={{ left: `${(P[0][0] / 320) * 100}%`, top: `${(P[0][1] / 64) * 100}%` }}><span className="material-symbols-outlined">home_repair_service</span></span>
          <span className={`job-route__end job-route__end--pin ${travel >= 1 ? 'is-reached' : ''}`} style={{ left: `${(P[3][0] / 320) * 100}%`, top: `${(P[3][1] / 64) * 100}%` }}><span className="material-symbols-outlined icon-fill">location_on</span></span>
          <span className="job-route__van" style={{ left: `${(vanX / 320) * 100}%`, top: `${(vanY / 64) * 100}%` }}><span className="material-symbols-outlined icon-fill">local_shipping</span></span>
        </div>

        <div className="grid grid-cols-[1.3fr_.85fr_1fr] gap-2">
          <div className="job-stat">
            <p>Technician</p>
            <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
              <Avatar name={JOB.staff} size={22} />
              <span className="truncate text-[12.5px] font-semibold text-ink">{index >= 1 ? JOB.staff : 'Assigning…'}</span>
            </div>
          </div>
          <div className="job-stat">
            <p>ETA</p>
            <b className="tabular-nums">{eta === null ? '—' : eta === 0 ? 'On site' : `${eta} min`}</b>
          </div>
          <div className="job-stat">
            <p>Total</p>
            <b className="tabular-nums">{JOB.total}</b>
          </div>
        </div>

        <ul className="grid gap-1.5" aria-label="Activity">
          {feed.map((item, position) => (
            <li key={item.text} className={`flex items-center gap-2.5 text-[12.5px] ${position === 0 ? 'animate-rise-in text-ink' : 'text-muted'}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${position === 0 ? 'bg-brand-soft text-brand-fg' : 'bg-sunken text-subtle'}`}><span className="material-symbols-outlined text-[14px]">{item.icon}</span></span>
              <span className="min-w-0 flex-1 truncate">{item.text}</span>
              <span className="shrink-0 tabular-nums text-subtle">{item.at}</span>
            </li>
          ))}
        </ul>
      </div>

      <footer className={`flex items-center gap-3 border-t border-line/80 px-5 py-3 text-[12.5px] transition-colors duration-500 ${status === 'Paid' ? 'bg-success-soft text-success-fg' : 'text-muted'}`}>
        <span className="material-symbols-outlined text-[17px]">{status === 'Paid' ? 'receipt_long' : 'timelapse'}</span>
        <span className="truncate font-medium">{status === 'Paid' ? 'Closed · rated 5★' : 'Job progress'}</span>
        <span className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-gradient-to-r from-brand to-accent transition-[width] duration-300" style={{ width: `${overall}%` }} /></span>
        <span className="w-9 text-right font-semibold tabular-nums">{overall}%</span>
      </footer>
    </article>
  );
}
