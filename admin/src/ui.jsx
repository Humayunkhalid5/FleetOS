import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function LogoMark({ size = 28, animated = false }) {
  return (
    <svg width={size} height={size * (70 / 64)} viewBox="0 0 64 70" fill="none" aria-hidden="true" className={animated ? 'logo-anim' : ''}>
      <path d="M3 13.2 30.3 1v14.8L3 28V13.2Z" fill="rgb(var(--brand))" />
      <path d="M3 32.6 30.3 20.5v14.7L3 47.4V32.6Z" fill="rgb(var(--brand-hover))" />
      <path d="m3 52 27.3-12.1v14.7L3 66.8V52Z" fill="#0AC7ED" />
      <path d="M36.8 14.9 62 3.7v14.7L36.8 29.6V14.9Z" fill="rgb(var(--brand))" opacity="0.85" />
      <path d="M36.8 34.4 62 23.2v14.7L36.8 49.1V34.4Z" fill="rgb(var(--brand))" opacity="0.7" />
    </svg>
  );
}

export function Logo() {
  return <span className="logo"><LogoMark size={24} /><span className="logo-word">FleetOS</span><span className="logo-tag">ADMIN</span></span>;
}

export const Icon = ({ name, fill = false, className = '' }) => <span className={`icon ${fill ? 'fill' : ''} ${className}`} aria-hidden="true">{name}</span>;

const TONES = {
  approved: ['success', 'verified'], active: ['success', 'check_circle'], recorded: ['success', 'receipt_long'], resolved: ['success', 'task_alt'],
  paid: ['success', 'paid'], completed: ['success', 'task_alt'], published: ['success', 'visibility'], visible: ['success', 'visibility'],
  pending: ['warning', 'schedule'], open: ['warning', 'radio_button_unchecked'],
  suspended: ['danger', 'pause_circle'], rejected: ['danger', 'block'], failed: ['danger', 'error'], cancelled: ['danger', 'cancel'], hidden: ['neutral', 'visibility_off'],
  assigned: ['info', 'assignment_ind'], 'en route': ['info', 'local_shipping'], arrived: ['info', 'where_to_vote'], 'in progress': ['brand', 'construction'],
  customer: ['neutral', 'person'], company: ['brand', 'domain'],
};

/** Status text with an icon — never colour alone (design.md). */
export function Status({ value }) {
  const [tone, icon] = TONES[String(value || '').toLowerCase()] || ['neutral', 'circle'];
  return <span className={`badge badge-${tone}`}><Icon name={icon} />{value || 'unknown'}</span>;
}

export function Empty({ icon = 'inbox', title, children }) {
  return <div className="empty"><Icon name={icon} /><b>{title}</b>{children && <span>{children}</span>}</div>;
}

export function Skeleton({ height = 16, width = '100%', style }) {
  return <span className="skeleton" style={{ display: 'block', height, width, ...style }} />;
}

export function Modal({ open, onClose, title, description, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}

const ToastContext = createContext(() => {});
let toastId = 0;
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = 'success') => {
    const id = ++toastId;
    setItems((list) => [...list.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      {createPortal(<div className="toasts" aria-live="polite">{items.map((item) => <div key={item.id} className={`toast ${item.tone}`}><Icon name={item.tone === 'error' ? 'error' : 'check_circle'} fill /><span>{item.message}</span></div>)}</div>, document.body)}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

/** Card with a searchable table. */
export function DataTable({ title, subtitle, headers, rows, renderRow, searchKeys, actions, empty = 'No records yet', emptyIcon = 'inbox', loading }) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const q = query.trim().toLowerCase();
  const matching = q && searchKeys ? rows.filter((row) => searchKeys(row).some((value) => String(value || '').toLowerCase().includes(q))) : rows;
  const visible = matching.slice(0, limit);
  return (
    <section className="card">
      <header className="card-header">
        <div><h2>{title}</h2><p>{subtitle || `${(q ? matching : rows).length} record${(q ? matching : rows).length === 1 ? '' : 's'}${q ? ' match' : ''}`}</p></div>
        <div className="actions">
          {searchKeys && <label className="search"><Icon name="search" /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label={`Search ${title}`} /></label>}
          {actions}
        </div>
      </header>
      {loading ? <div className="card-body" style={{ display: 'grid', gap: 12 }}>{[0, 1, 2, 3].map((key) => <Skeleton key={key} height={18} />)}</div> : visible.length ? (
        <>
          <div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{visible.map(renderRow)}</tbody></table></div>
          {matching.length > visible.length && <div className="more"><button type="button" className="btn btn-secondary btn-sm" onClick={() => setLimit((value) => value + 100)}>Show more ({matching.length - visible.length} remaining)</button></div>}
        </>
      ) : <Empty icon={q ? 'search_off' : emptyIcon} title={q ? 'No matches' : empty} />}
    </section>
  );
}
