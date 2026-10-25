import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useNotifications } from '../../../hooks/usePortalCounts';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { Alert, EmptyState, SkeletonRows } from '../../../components/ui';
import { timeAgo, formatDateTime } from '../../../utils/helpers';

const ICONS = { booking: 'event_available', status_change: 'sync', payment: 'payments', review: 'star', chat: 'forum' };

function Notifications() {
  const navigate = useNavigate();
  const { notifications, unread, loading, error, refresh, mutate } = useNotifications();

  const markAll = async () => {
    mutate((current) => current && { ...current, unreadCount: 0, notifications: current.notifications.map((item) => ({ ...item, read: true })) });
    await api.patch('/notifications/read-all', {}).catch(() => {});
  };

  const open = (item) => {
    if (!item.read) {
      mutate((current) => current && { ...current, unreadCount: Math.max(0, current.unreadCount - 1), notifications: current.notifications.map((entry) => (entry._id === item._id ? { ...entry, read: true } : entry)) });
      api.patch(`/notifications/${item._id}/read`, {}).catch(() => {});
    }
    if (item.link) navigate(item.link);
  };

  usePageChrome({
    title: 'Notifications',
    subtitle: unread ? `${unread} unread` : 'Booking, payment and review updates.',
    actions: unread > 0 && <button type="button" className="btn btn-secondary" onClick={markAll}><span className="material-symbols-outlined">done_all</span>Mark all read</button>,
  });

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <Alert onRetry={refresh}>{error && !notifications.length ? error.message : ''}</Alert>
      <section className="card overflow-hidden">
        {loading ? <div className="p-5"><SkeletonRows rows={5} /></div> : notifications.length ? (
          <ul className="divide-y divide-line">
            {notifications.map((item) => (
              <li key={item._id}>
                <button type="button" onClick={() => open(item)} className={`flex w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-sunken ${item.read ? '' : 'bg-brand-soft/30'}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.read ? 'bg-sunken text-subtle' : 'bg-brand-soft text-brand-fg'}`}><span className="material-symbols-outlined">{ICONS[item.type] || 'notifications'}</span></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-[14px] font-semibold text-ink">{item.title}</span>
                      <span className="shrink-0 text-[12px] text-subtle" title={formatDateTime(item.createdAt)}>{timeAgo(item.createdAt)}</span>
                    </span>
                    <span className="mt-0.5 block text-[13.5px] text-muted">{item.message}</span>
                  </span>
                  {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                </button>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon="notifications_off" title="You're all caught up">Updates about your bookings arrive here the moment they happen.</EmptyState>}
      </section>
    </div>
  );
}

export default Notifications;
