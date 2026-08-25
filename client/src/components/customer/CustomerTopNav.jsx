import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';
import CustomerProfileButton from './CustomerProfileButton';
import fleetosLogo from '../../assets/fleetos-light.svg';

function CustomerTopNav({ title = 'FleetOS', subtitle = '', backTo = '', showBack = true, actions = null }) {
  const navigate = useNavigate();

  return (
    <header className="client-top-nav sticky top-0 w-full z-50 px-5 md:px-8 h-20 bg-white/88 backdrop-blur-xl border-b border-[#E0E1DD]/80">
      <div className="h-full max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button onClick={() => (backTo ? navigate(backTo) : navigate(-1))} className="w-10 h-10 rounded-full bg-[#E0E1DD]/60 text-[#1B263B] hover:bg-[#778DA9]/30 transition-colors grid place-items-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          )}
          <Link to={ROUTES.companies} className="client-nav-brand shrink-0" aria-label="FleetOS companies">
            <img src={fleetosLogo} alt="FleetOS" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-black tracking-tight text-[#0D1B2A] truncate">{title}</h1>
            {subtitle && <p className="hidden sm:block text-xs font-semibold text-[#415A77] truncate">{subtitle}</p>}
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1 rounded-full bg-[#E0E1DD]/45 p-1 border border-[#E0E1DD]">
          <Link to={ROUTES.companies} className="px-4 py-2 rounded-full text-xs font-black text-[#1B263B] hover:bg-white/80 transition-colors">Companies</Link>
          <Link to={ROUTES.bookings} className="px-4 py-2 rounded-full text-xs font-black text-[#1B263B] hover:bg-white/80 transition-colors">Bookings</Link>
          <Link to={ROUTES.chat} className="px-4 py-2 rounded-full text-xs font-black text-[#1B263B] hover:bg-white/80 transition-colors">Messages</Link>
          <Link to={ROUTES.reviews} className="px-4 py-2 rounded-full text-xs font-black text-[#1B263B] hover:bg-white/80 transition-colors">Reviews</Link>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <CustomerProfileButton />
        </div>
      </div>
    </header>
  );
}

export default CustomerTopNav;
