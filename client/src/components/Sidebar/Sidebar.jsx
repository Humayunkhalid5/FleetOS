import { useNavigate, useLocation } from 'react-router-dom';
import { SIDEBAR_LINKS, SIDEBAR_FOOTER_LINKS, ROUTES } from '../../constants';
import { useAppContext } from '../../context/AppContext';

/**
 * Sidebar — reusable navigation drawer used across all customer pages.
 *
 * Props:
 *   open     {boolean}  — whether the drawer is visible
 *   onClose  {function} — called when the backdrop or close button is clicked
 */
function Sidebar({ open, onClose }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, logout } = useAppContext();

  const displayUser = user || {
    name: 'Ali Shahzad',
    role: 'Fleet Manager',
    plan: 'Fleet Member',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCUJ5EIaqdsSDN9waPZS_pwz3p-_xqvr3XG-k7zUJKvSUvUzXrP4eCGi5nKdDa9vXLgdN4PN2U1cVz5ePyqh9NBDD_4_g-2IIAzjwzYKCLe-Q828-VbdE-VoPcGhq_X7Wn2MS5RWR70OjBxgiBrFZWZNlMb-tjUKn0RMatMVTkKz2zK7APCY6ygiyndUsnjWx_QPuLTqiKXrNqD0fHHLritrtlSvwxxMuDu7A_Mxv5S09njsq4mZxYoWQ',
  };

  const goTo = (to) => {
    onClose?.();
    navigate(to);
  };

  const handleLogout = () => {
    onClose?.();
    logout();
    navigate(ROUTES.login);
  };

  const isActive = (to) => location.pathname === to;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-on-background/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 z-[70] bg-surface shadow-2xl rounded-r-2xl flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation drawer"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-container-low transition-colors"
          aria-label="Close menu"
        >
          <span className="material-symbols-outlined text-on-surface-variant">close</span>
        </button>

        {/* Profile header */}
        <div className="px-lg pt-xl pb-lg border-b border-surface-container-low">
          <div
            className="w-16 h-16 rounded-full overflow-hidden mb-md shadow-md border-2 border-primary-fixed cursor-pointer"
            onClick={() => goTo(ROUTES.profile)}
            title="View profile"
          >
            <img
              className="w-full h-full object-cover"
              alt={displayUser.name}
              src={displayUser.avatar}
            />
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface leading-tight">
            {displayUser.name}
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">{displayUser.role}</p>
          {displayUser.plan && (
            <span className="inline-block mt-xs px-2 py-0.5 bg-primary-container text-on-primary-container text-[10px] font-bold rounded uppercase tracking-wider">
              {displayUser.plan}
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-md space-y-0.5 px-md">
          {SIDEBAR_LINKS.map((link) => {
            const active = isActive(link.to);
            return (
              <a
                key={link.label}
                href={link.to}
                onClick={(e) => { e.preventDefault(); goTo(link.to); }}
                className={`flex items-center gap-md py-3 px-md rounded-xl transition-colors ${
                  active
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className="material-symbols-outlined"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {link.icon}
                </span>
                <span className="font-nav-item text-nav-item">{link.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </a>
            );
          })}

          <div className="my-md mx-md h-px bg-surface-container-low" />

          {SIDEBAR_FOOTER_LINKS.map((link) => {
            const active = isActive(link.to);
            return (
              <a
                key={link.label}
                href={link.to}
                onClick={(e) => { e.preventDefault(); goTo(link.to); }}
                className={`flex items-center gap-md py-3 px-md rounded-xl transition-colors ${
                  active
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined">{link.icon}</span>
                <span className="font-nav-item text-nav-item">{link.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Logout at the bottom */}
        <div className="px-md pb-lg pt-md border-t border-surface-container-low">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-md py-3 px-md rounded-xl text-error hover:bg-error-container/20 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-nav-item text-nav-item">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
