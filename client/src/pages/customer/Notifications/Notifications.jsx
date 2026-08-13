import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES, BOTTOM_NAV } from '../../../constants';

// Demo notifications when API is unavailable
const DEMO_NOTIFICATIONS = [
  {
    id: 'n-001',
    type: 'booking',
    icon: 'engineering',
    iconBg: 'bg-primary-container',
    iconColor: 'text-on-primary-container',
    title: 'Technician Assigned',
    body: 'Marcus Chen has been assigned to your HVAC Maintenance booking #FOS-88219.',
    time: '2 hours ago',
    read: false,
    action: { label: 'Track Progress', route: ROUTES.liveTracking },
  },
  {
    id: 'n-002',
    type: 'payment',
    icon: 'payments',
    iconBg: 'bg-secondary-container',
    iconColor: 'text-on-secondary-container',
    title: 'Payment Confirmed',
    body: 'Your payment of $196.12 for booking #FOS-88219 was successfully processed.',
    time: 'Yesterday',
    read: false,
    action: { label: 'View Receipt', route: ROUTES.payments },
  },
  {
    id: 'n-003',
    type: 'review',
    icon: 'rate_review',
    iconBg: 'bg-tertiary-container',
    iconColor: 'text-on-tertiary-container',
    title: 'Leave a Review',
    body: 'Your Engine Diagnostics service is complete. Share your feedback to help others.',
    time: 'Oct 19',
    read: true,
    action: { label: 'Write Review', route: ROUTES.reviews },
  },
  {
    id: 'n-004',
    type: 'promo',
    icon: 'local_offer',
    iconBg: 'bg-surface-container-high',
    iconColor: 'text-on-surface-variant',
    title: '20% Off Plumbing Services',
    body: 'Exclusive offer for Premium members. Book a plumbing service today and save big!',
    time: 'Oct 15',
    read: true,
    action: { label: 'Browse Services', route: ROUTES.companies },
  },
  {
    id: 'n-005',
    type: 'system',
    icon: 'verified_user',
    iconBg: 'bg-surface-container-high',
    iconColor: 'text-on-surface-variant',
    title: 'Account Verified',
    body: 'Your FleetOS account has been verified. You can now access all premium features.',
    time: 'Oct 10',
    read: true,
    action: null,
  },
];

const FILTER_TABS = ['All', 'Unread', 'Bookings', 'Payments', 'Promos'];
const TYPE_MAP = { Bookings: 'booking', Payments: 'payment', Promos: 'promo' };

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState('All');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Unread') return !n.read;
    return n.type === TYPE_MAP[activeFilter];
  });

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const dismiss = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="bg-background text-on-surface min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm">
        <div className="flex items-center gap-md">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-primary text-on-primary text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-sm">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm text-primary font-nav-item hover:underline px-2"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => navigate(ROUTES.dashboard)}
            className="p-2 rounded-full hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">home</span>
          </button>
        </div>
      </header>

      <main className="pt-24 pb-10 px-container-margin max-w-2xl mx-auto space-y-lg">

        {/* Filter tabs */}
        <div className="flex gap-sm overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`shrink-0 px-lg py-sm rounded-full font-nav-item text-nav-item transition-colors ${
                activeFilter === tab
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              {tab}
              {tab === 'Unread' && unreadCount > 0 && (
                <span className="ml-1 text-xs font-bold">({unreadCount})</span>
              )}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {filtered.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-xl text-center border border-surface-container-low">
            <span className="material-symbols-outlined text-4xl text-outline mb-md block">notifications_off</span>
            <p className="font-body-lg text-on-surface">No notifications here</p>
            <p className="font-body-md text-on-surface-variant mt-xs">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-sm">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={`relative bg-surface-container-lowest rounded-xl p-lg shadow-elevation-1 border transition-all cursor-pointer group ${
                  notif.read ? 'border-surface-container-low' : 'border-primary/30 bg-primary/5'
                }`}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <span className="absolute top-md left-md w-2 h-2 rounded-full bg-primary" />
                )}

                <div className="flex items-start gap-md">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${notif.iconBg}`}>
                    <span className={`material-symbols-outlined ${notif.iconColor}`}>{notif.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-sm">
                      <p className={`font-nav-item text-nav-item ${notif.read ? 'text-on-surface' : 'text-primary font-bold'}`}>
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-xs shrink-0">
                        <span className="text-xs text-outline">{notif.time}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-surface-container-high transition-all"
                          title="Dismiss"
                        >
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">close</span>
                        </button>
                      </div>
                    </div>

                    <p className="font-body-md text-body-md text-on-surface-variant mt-xs leading-snug">
                      {notif.body}
                    </p>

                    {notif.action && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(notif.id);
                          navigate(notif.action.route);
                        }}
                        className="mt-md inline-flex items-center gap-xs text-primary font-nav-item text-sm hover:underline"
                      >
                        {notif.action.label}
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notification preferences hint */}
        <div className="bg-surface-container-lowest rounded-xl p-lg border border-surface-container-low flex items-center gap-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-surface-variant">tune</span>
          </div>
          <div className="flex-1">
            <p className="font-nav-item text-nav-item text-on-surface">Notification Preferences</p>
            <p className="font-body-md text-body-md text-on-surface-variant">Manage what alerts you receive</p>
          </div>
          <button
            onClick={() => navigate(ROUTES.profile)}
            className="text-primary font-nav-item text-sm hover:underline shrink-0"
          >
            Manage
          </button>
        </div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-container-margin py-sm bg-surface shadow-[0_-4px_16px_0_rgba(11,29,45,0.12)] rounded-t-xl md:hidden">
        {BOTTOM_NAV.map((item) => (
          <a
            key={item.label}
            href={item.to}
            onClick={(e) => { e.preventDefault(); navigate(item.to); }}
            className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-all duration-150"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-nav-item text-[10px] mt-0.5">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

export default Notifications;
