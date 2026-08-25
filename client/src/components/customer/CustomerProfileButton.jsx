import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

const fallbackAvatar = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=160&q=80';

function CustomerProfileButton() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const avatar = user?.avatar || fallbackAvatar;
  const name = user?.name || 'Client';

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const closeMenu = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => () => closeTimer.current && clearTimeout(closeTimer.current), []);

  const signOut = async () => {
    await logout();
    navigate(ROUTES.login);
  };

  const items = [
    ['person', 'Profile', ROUTES.profile],
    ['settings', 'Settings', ROUTES.profile],
    ['calendar_today', 'My Bookings', ROUTES.bookings],
    ['rate_review', 'Reviews', ROUTES.reviews],
    ['payments', 'Payments', ROUTES.payments],
    ['forum', 'Messages', ROUTES.chat],
  ];

  return (
    <div className="relative customer-profile-control" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="client-profile-trigger client-avatar-only relative w-10 h-10 rounded-full bg-white shadow-sm grid place-items-center hover:shadow-md hover:-translate-y-0.5 transition-all"
        aria-label="Open client profile menu"
      >
        <span className="client-avatar-halo" />
        <img src={avatar} alt={name} className="relative z-10 w-9 h-9 rounded-full object-cover" />
        <span className={`absolute z-20 -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0D1B2A] text-white grid place-items-center transition-transform ${open ? 'rotate-180' : ''}`}>
          <span className="material-symbols-outlined text-[11px]">expand_more</span>
        </span>
      </button>

      <div className={`client-profile-menu absolute right-0 mt-3 w-72 rounded-[28px] bg-white shadow-[0_26px_80px_rgba(13,27,42,.16)] overflow-hidden transition-all duration-200 origin-top-right ${open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}>
        <div className="p-4 bg-[linear-gradient(135deg,#0D1B2A,#1B263B)] text-white flex items-center gap-3">
          <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover ring-2 ring-[#E0E1DD]/45" />
          <div className="min-w-0">
            <p className="text-sm font-black truncate text-white">{name}</p>
            <p className="text-xs text-white/65 truncate">{user?.email || 'Client account'}</p>
          </div>
        </div>
        <div className="p-2">
          {items.map(([icon, label, to]) => (
            <Link key={label} to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-[#1B263B] hover:bg-[#E0E1DD]/55 transition-colors">
              <span className="material-symbols-outlined text-[19px] text-[#415A77]">{icon}</span>
              {label}
            </Link>
          ))}
          <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black text-red-600 hover:bg-red-50 transition-colors">
            <span className="material-symbols-outlined text-[19px]">logout</span>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerProfileButton;
