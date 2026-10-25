import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { LIFECYCLE, STATUS_META } from './status';
import { fulfillmentOf, statusLabel } from '../../constants/fulfillment';

/* ------------------------------------------------------------------ status */
/** Text + icon status label — never colour alone (design.md). With a
 *  fulfilment type the label uses that job's wording ("Out for delivery"). */
export function StatusBadge({ status, fulfillment, className = '', icon = true }) {
  const [tone, glyph] = STATUS_META[String(status || '').toLowerCase()] || ['neutral', 'circle'];
  const label = fulfillment ? statusLabel(status, fulfillment) : status;
  return (
    <span className={`badge badge-${tone} ${className}`}>
      {icon && <span className="material-symbols-outlined" aria-hidden="true">{glyph}</span>}
      {label || 'Unknown'}
    </span>
  );
}

/** Progress rail for the steps of this kind of job; highlights the current step. */
export function LifecycleRail({ status, fulfillment, compact = false, className = '' }) {
  const steps = fulfillment ? fulfillmentOf(fulfillment).flow : LIFECYCLE;
  const name = (step) => (fulfillment ? statusLabel(step, fulfillment) : step);
  const index = steps.indexOf(status);
  if (status === 'Cancelled') return <StatusBadge status="Cancelled" className={className} />;
  return (
    <div className={`lifecycle-wrap ${className}`}>
      <div className="lifecycle" role="list" aria-label={`Progress: ${name(status)}`}>
        {steps.map((step, stepIndex) => (
          <div key={step} role="listitem" aria-current={stepIndex === index ? 'step' : undefined} className={`lifecycle__step ${stepIndex < index ? 'is-done' : ''} ${stepIndex === index ? 'is-current' : ''}`}>
            <span className="lifecycle__bar" />
            {!compact && <span className="lifecycle__label">{name(step)}</span>}
          </div>
        ))}
      </div>
      {!compact && index >= 0 && <p className="lifecycle__caption"><span>Step {index + 1} of {steps.length}</span><b>{name(status)}{steps[index + 1] ? ` → ${name(steps[index + 1])}` : ''}</b></p>}
    </div>
  );
}

/* --------------------------------------------------------------- feedback */
export function Skeleton({ className = '', style }) {
  return <span className={`skeleton block ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 5, className = '' }) {
  return (
    <div className={`grid gap-3 ${className}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="grid flex-1 gap-2"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6, className = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' }) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card overflow-hidden">
          <Skeleton className="h-36 rounded-none" />
          <div className="grid gap-2.5 p-5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /><Skeleton className="mt-2 h-9 w-full rounded-xl" /></div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, children, action, className = '' }) {
  return (
    <div className={`grid justify-items-center gap-2 px-6 py-14 text-center ${className}`}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sunken text-subtle">
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </span>
      <p className="mt-2 text-[15px] font-semibold text-ink">{title}</p>
      {children && <p className="max-w-sm text-[13.5px] text-muted">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Alert({ tone = 'danger', icon, children, onRetry, className = '' }) {
  if (!children) return null;
  const glyph = icon || { danger: 'error', warning: 'warning', success: 'check_circle', info: 'info' }[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border border-${tone}-line bg-${tone}-soft px-4 py-3 text-[13.5px] font-medium text-${tone}-fg ${className}`}>
      <span className="material-symbols-outlined mt-0.5 text-[19px]">{glyph}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {onRetry && <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-4">Retry</button>}
    </div>
  );
}

export function Spinner({ className = 'h-4 w-4' }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} aria-hidden="true" />;
}

/* -------------------------------------------------------------- data bits */
export function StatCard({ icon, label, value, hint, tone = 'brand', trend, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`stat-card card card-pad grid gap-4 text-left ${onClick ? 'transition-colors hover:border-line-strong' : ''}`}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="stat-label min-w-0 text-[13px] font-medium text-muted">{label}</span>
        <span className={`stat-icon grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-${tone}-soft text-${tone === 'brand' ? 'brand-fg' : `${tone}-fg`}`}>
          <span className="material-symbols-outlined icon-fill text-[19px]">{icon}</span>
        </span>
      </div>
      <div className="min-w-0">
        <p className="stat-value truncate text-[26px] font-bold leading-none tracking-tight text-ink tabular-nums" title={typeof value === 'string' ? value : undefined}>{value}</p>
        {(hint || trend) && <p className="stat-hint mt-2 text-xs text-subtle">{trend && <span className="mr-1 font-semibold text-success-fg">{trend}</span>}{hint}</p>}
      </div>
    </Tag>
  );
}

export function Avatar({ name = '', src, size = 36, className = '' }) {
  const initials = String(name || '?').split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className={`avatar ${className}`} style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials}
    </span>
  );
}

export function Stars({ value = 0, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${Number(value).toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`material-symbols-outlined ${star <= Math.round(value) ? 'icon-fill text-warning' : 'text-line-strong'}`} style={{ fontSize: size }}>star</span>
      ))}
    </span>
  );
}

export function Field({ label, hint, error, children, className = '' }) {
  const id = useId();
  return (
    <label htmlFor={id} className={`field ${className}`}>
      {label && <span className="label">{label}</span>}
      {typeof children === 'function' ? children(id) : children}
      {error ? <span className="text-xs font-medium text-danger-fg">{error}</span> : hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`hide-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-sunken p-1 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const [key, label, count] = Array.isArray(tab) ? tab : [tab, tab];
        const selected = value === key;
        return (
          <button key={key} type="button" role="tab" aria-selected={selected} onClick={() => onChange(key)} className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors ${selected ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'}`}>
            {label}
            {count !== undefined && <span className={`rounded-full px-1.5 text-[11px] font-semibold ${selected ? 'bg-brand-soft text-brand-fg' : 'bg-surface/60 text-subtle'}`}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ modal */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }) {
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (event) => { if (event.key === 'Escape' && dismissible) onClose?.(); };
    document.addEventListener('keydown', onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => panelRef.current?.querySelector('input,textarea,select,button[data-autofocus]')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = original; previous?.focus?.(); };
  }, [open, onClose, dismissible]);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-navy/40 backdrop-blur-[3px] dark:bg-black/60" onClick={dismissible ? onClose : undefined} />
      <section ref={panelRef} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className={`relative flex max-h-[min(88dvh,820px)] w-full ${width} animate-scale-in flex-col overflow-hidden rounded-2xl border border-line bg-raised shadow-pop sm:rounded-3xl`}>
        {(title || description) && (
          <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-4 sm:gap-4 sm:px-6 sm:pt-6">
            <div>
              {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
              {description && <p className="mt-1 text-[13.5px] text-muted">{description}</p>}
            </div>
            {dismissible && <button type="button" onClick={onClose} className="btn btn-ghost btn-icon btn-sm -mr-2 -mt-1" aria-label="Close"><span className="material-symbols-outlined">close</span></button>}
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line bg-sunken/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}
