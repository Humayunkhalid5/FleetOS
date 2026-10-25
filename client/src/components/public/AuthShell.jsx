import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';
import { LifecycleRail } from '../ui';

/** Two-column frame for sign-in and registration screens. */
export default function AuthShell({ title, subtitle, children, aside, wide = false }) {
  return (
    <div className={`mx-auto grid min-h-[calc(100vh-64px)] max-w-[1200px] gap-10 px-4 py-10 sm:px-6 ${wide ? '' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'} lg:items-center`}>
      <section className={`mx-auto w-full ${wide ? 'max-w-3xl' : 'max-w-[420px]'} animate-rise-in`}>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-[14.5px] text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </section>
      {!wide && (
        <aside className="auth-aside relative hidden overflow-hidden rounded-[28px] p-10 lg:block" aria-hidden="true">
          <div className="relative flex h-full min-h-[520px] flex-col justify-between">
            <Link to="/" className="w-fit"><Logo size={28} /></Link>
            {aside || (
              <div>
                <p className="max-w-[22ch] text-[30px] font-bold leading-[1.15] tracking-tight text-ink">Book, track and pay in one place.</p>
                <div className="card mt-10 p-5">
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="truncate font-semibold text-ink">Panel replacement · FOS-1932</span>
                    <span className="shrink-0 text-muted">ETA 9 min</span>
                  </div>
                  <div className="mt-4">
                    <LifecycleRail status="En Route" compact /><p className="mt-3 text-[12.5px] text-muted">Assigned → <span className="font-semibold text-ink">En Route</span> → Arrived</p>
                  </div>
                </div>
                <ul className="mt-8 grid gap-3 text-[14px] text-muted">
                  {['Book approved companies', 'Track your technician on the map', 'Keep invoices and reviews together'].map((item) => (
                    <li key={item} className="flex items-center gap-3"><span className="material-symbols-outlined icon-fill text-[18px] text-brand-fg">check_circle</span>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
