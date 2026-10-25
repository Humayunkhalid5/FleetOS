import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useNotifications } from '../../hooks/usePortalCounts';
import { EmptyState } from '../ui';

function timeAgo(value) {
  const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const iconFor = (type) => ({ booking: 'event_available', payment: 'payments', review: 'star', chat: 'forum', system: 'info' }[type] || 'notifications');

/** Header bell with a live dropdown feed. `allHref` links to a full page. */
export default function NotificationBell({ allHref }) {
  const navigate = useNavigate();
  const { notifications, unread, mutate } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const markAll = async () => {
    mutate((current) => current && { ...current, unreadCount: 0, notifications: current.notifications.map((item) => ({ ...item, read: true })) });
    await api.patch('/notifications/read-all', {}).catch(() => {});
  };

  const openItem = async (item) => {
    setOpen(false);
    if (!item.read) {
      mutate((current) => current && { ...current, unreadCount: Math.max(0, (current.unreadCount || 1) - 1), notifications: current.notifications.map((entry) => (entry._id === item._id ? { ...entry, read: true } : entry)) });
      api.patch(`/notifications/${item._id}/read`, {}).catch(() => {});
    }
    if (item.link) navigate(item.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="btn btn-ghost btn-icon relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
        <span className="material-symbols-outlined">notifications</span>
        {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white ring-2 ring-canvas">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[60] w-[min(92vw,380px)] origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-line bg-raised shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[14px] font-semibold">Notifications</p>
            {unread > 0 && <button type="button" onClick={markAll} className="text-[12.5px] font-semibold text-brand-fg hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length ? notifications.slice(0, 12).map((item) => (
              <button type="button" key={item._id} onClick={() => openItem(item)} className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-sunken ${item.read ? '' : 'bg-brand-soft/30'}`}>
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.read ? 'bg-sunken text-subtle' : 'bg-brand-soft text-brand-fg'}`}><span className="material-symbols-outlined text-[18px]">{iconFor(item.type)}</span></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-[13.5px] font-semibold text-ink">{item.title}</span>
                    <span className="shrink-0 text-[11.5px] text-subtle">{timeAgo(item.createdAt)}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-muted">{item.message}</span>
                </span>
              </button>
            )) : <EmptyState icon="notifications_off" title="You're all caught up">Booking, payment and review updates will show up here.</EmptyState>}
          </div>
          {allHref && <button type="button" onClick={() => { setOpen(false); navigate(allHref); }} className="w-full border-t border-line px-4 py-2.5 text-[13px] font-semibold text-brand-fg hover:bg-sunken">View all notifications</button>}
        </div>
      )}
    </div>
  );
}
