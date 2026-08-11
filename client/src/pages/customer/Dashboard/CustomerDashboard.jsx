import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES, companyRoute, BOTTOM_NAV, CATEGORIES } from '../../../constants';
import Sidebar from '../../../components/Sidebar/Sidebar';
import api from '../../../services/api';

// Fallback data used if the API omits areasByCity
const FALLBACK_AREAS = {
  Lahore: ['Gulberg', 'DHA', 'Model Town', 'Johar Town', 'Bahria Town', 'Liberty'],
  Karachi: ['Clifton', 'DHA', 'Gulshan-e-Iqbal', 'Saddar', 'PECHS', 'Nazimabad'],
  Islamabad: ['F-7', 'F-8', 'F-10', 'G-9', 'G-10', 'Blue Area'],
  Rawalpindi: ['Saddar', 'Satellite Town', 'Bahria Town', 'Gulraiz', 'Chaklala', 'Westridge'],
};

function CustomerDashboard() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ongoingBooking, setOngoingBooking] = useState(null);
  const [ongoingLoading, setOngoingLoading] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [areaFilter, setAreaFilter] = useState('All');
  const [areasByCity, setAreasByCity] = useState(FALLBACK_AREAS);
  const [companies, setCompanies] = useState([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [filterApplied, setFilterApplied] = useState(false);


  // Fetch the user's most recent in-progress booking for the "Ongoing Request" card
  useEffect(() => {
    const fetchOngoing = async () => {
      if (!user) return;
      setOngoingLoading(true);
      try {
        const { bookings } = await api.get('/bookings');
        const active = (bookings || []).find((b) => b.status === 'in-progress') || null;
        setOngoingBooking(active);
      } catch {
        setOngoingBooking(null);
      } finally {
        setOngoingLoading(false);
      }
    };
    fetchOngoing();
  }, [user]);

  useEffect(() => {
    const fetchCompanies = async () => {
      setCompanyLoading(true);
      try {
        const query = new URLSearchParams();
        if (locationFilter.trim()) query.set('location', locationFilter.trim());
        if (cityFilter !== 'All') query.set('location', cityFilter);
        if (areaFilter !== 'All') query.set('area', areaFilter);
        const response = await api.get(`/companies?${query.toString()}`);
        let fetched = response.companies || [];

        let localCompanies = [];
        try {
          localCompanies = JSON.parse(localStorage.getItem('fleetos-registered-companies') || '[]');
        } catch (e) {}

        for (const locComp of localCompanies) {
          const exists = fetched.some((c) => c.slug === locComp.slug || c._id === locComp._id || c.name === locComp.name);
          if (!exists) {
            fetched.unshift(locComp);
          }
        }

        setCompanies(fetched);
        if (response.areasByCity && Object.keys(response.areasByCity).length) {
          setAreasByCity(response.areasByCity);
        }
      } catch {
        let localCompanies = [];
        try {
          localCompanies = JSON.parse(localStorage.getItem('fleetos-registered-companies') || '[]');
        } catch (e) {}
        setCompanies(localCompanies);
      } finally {
        setCompanyLoading(false);
      }
    };
    fetchCompanies();
  }, [locationFilter, cityFilter, areaFilter]);

  const goTo = (to, options) => {
    setMenuOpen(false);
    navigate(to, options);
  };

  const selectCity = (nextCity) => {
    setCityFilter(nextCity);
    setAreaFilter('All');
  };

  const availableAreas = cityFilter === 'All' ? [] : (areasByCity[cityFilter] || []);

  if (loading) {
    return <div className="p-xl text-center text-on-surface-variant font-body-md">Loading your FleetOS workspace...</div>;
  }

  const displayUser = user || {
    name: 'Alex Thompson',
    role: 'Fleet Manager',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUJ5EIaqdsSDN9waPZS_pwz3p-_xqvr3XG-k7zUJKvSUvUzXrP4eCGi5nKdDa9vXLgdN4PN2U1cVz5ePyqh9NBDD_4_g-2IIAzjwzYKCLe-Q828-VbdE-VoPcGhq_X7Wn2MS5RWR70OjBxgiBrFZWZNlMb-tjUKn0RMatMVTkKz2zK7APCY6ygiyndUsnjWx_QPuLTqiKXrNqD0fHHLritrtlSvwxxMuDu7A_Mxv5S09njsq4mZxYoWQ',
    plan: 'Premium Member',
  };

const toggleMenu = () => setMenuOpen(!menuOpen);
  const visibleCompanies = companies || [];
  const activeLocationLabel =
    areaFilter !== 'All' ? `${areaFilter}, ${cityFilter}` : cityFilter !== 'All' ? cityFilter : locationFilter.trim() || 'all cities';
  const handleSearch = () => {
    setFilterApplied(Boolean(locationFilter.trim() || cityFilter !== 'All'));
  };

  return (
    <div className="bg-background text-on-surface min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm transition-colors duration-200 ease-in-out">
        <div className="flex items-center gap-md">
          <button onClick={toggleMenu} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">menu</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">FleetOS</h1>
        </div>
        <div className="flex items-center gap-md">
          <button onClick={() => goTo(ROUTES.notifications)} className="p-2 hover:bg-surface-container-low rounded-full transition-colors relative">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            {/* Unread badge */}
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
          </button>
          <div
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-fixed shadow-sm cursor-pointer"
            onClick={() => goTo(ROUTES.profile)}
            title="View Profile"
          >
            <img className="w-full h-full object-cover" alt="Profile" src={displayUser.avatar} />
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="pt-20 px-container-margin max-w-7xl mx-auto space-y-lg">
        {/* Search Section */}
        <section className="mt-4 space-y-sm">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-on-surface-variant">search</span>
            </div>
            <input
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              className="w-full h-14 pl-12 pr-4 bg-surface-container-lowest border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-body-md transition-all shadow-elevation-1"
              placeholder="Search by city or area in Pakistan" type="text"
            />
          </div>

          {/* City chips */}
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">1. Pick your city</p>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {['All', 'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar'].map((c) => (
                <button
                  key={c}
                  onClick={() => selectCity(c)}
                  className={`shrink-0 px-4 py-2 rounded-full font-nav-item text-nav-item transition-all ${
                    cityFilter === c ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Area chips — shown once a city is selected */}
          {cityFilter !== 'All' && (
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">2. Pick your nearby area</p>
              <div className="flex gap-2 flex-wrap pb-1">
                <button
                  onClick={() => setAreaFilter('All')}
                  className={`shrink-0 px-4 py-2 rounded-full font-nav-item text-nav-item transition-all ${
                    areaFilter === 'All' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Entire {cityFilter}
                </button>
                {availableAreas.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAreaFilter(a)}
                    className={`shrink-0 px-4 py-2 rounded-full font-nav-item text-nav-item transition-all ${
                      areaFilter === a ? 'bg-secondary-container text-on-secondary-container font-bold' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-sm">
            <p className="text-sm text-on-surface-variant">Showing {visibleCompanies.length} company{visibleCompanies.length === 1 ? '' : 'ies'} for {activeLocationLabel}.</p>
            {filterApplied && (
              <button onClick={() => { setLocationFilter(''); setCityFilter('All'); setAreaFilter('All'); setFilterApplied(false); }} className="text-sm text-primary hover:underline">Clear filter</button>
            )}
          </div>
        </section>

        {/* Promotions Banner */}
        <section className="relative overflow-hidden rounded-xl h-48 bg-primary-container shadow-elevation-1">
          <div className="relative z-10 flex flex-col justify-center h-full p-lg text-on-primary-container">
            <span className="font-label-sm uppercase tracking-wider mb-xs">Limited Offer</span>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile font-bold mb-md max-w-[280px]">20% off your first plumbing service</h2>
          <button onClick={() => goTo(ROUTES.companies)} className="w-fit px-lg py-sm bg-surface-container-lowest text-primary font-bold rounded-lg shadow-md hover:scale-105 transition-transform active:scale-95">
              Claim Now
            </button>
          </div>
        </section>

        {/* Categories Section */}
        <section className="space-y-md">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">Categories</h3>
            <button onClick={() => goTo(ROUTES.companies)} className="text-primary font-nav-item hover:underline">View all</button>
          </div>
          <div className="flex gap-md overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin pb-2">
            {CATEGORIES.map(item => (
              <button key={item.label} onClick={() => goTo(ROUTES.companies)} className="flex flex-col items-center gap-sm shrink-0 group">
                <div className="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center group-hover:bg-primary-container transition-colors duration-200">
                  <span className="material-symbols-outlined text-on-secondary-fixed-variant group-hover:text-on-primary-container">{item.icon}</span>
                </div>
                <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-primary group-hover:font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Booking Card */}
        <section className="space-y-md">
          <h3 className="font-headline-md text-headline-md text-on-surface">Ongoing Request</h3>
          {ongoingLoading ? (
            <div className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low text-center text-on-surface-variant font-body-md">
              Loading your ongoing request...
            </div>
          ) : ongoingBooking ? (
          <div className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low relative overflow-hidden">
            <div className="absolute top-0 right-0 p-md">
              <span className="px-md py-1 bg-tertiary-container text-on-tertiary-container rounded-full text-[10px] font-bold uppercase tracking-widest">In Progress</span>
            </div>
            <div className="flex items-start gap-md">
              <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">engineering</span>
              </div>
              <div className="flex-1">
                <h4 className="font-body-lg text-body-lg font-bold text-on-surface">{ongoingBooking.service}</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">Scheduled for: {ongoingBooking.scheduledDate || 'Today'} {ongoingBooking.scheduledTime ? `• ${ongoingBooking.scheduledTime}` : ''}</p>
                <div className="mt-md flex items-center gap-sm">
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    <img className="w-full h-full object-cover" alt="Tech" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXseizkm1YjckE5n5VxMg5CggM5tWpEmFJb6Nh_K_YkNVo40p1Yevl-WlnGuO8GzMdJdrZp8kdZQb3ZDcSxuiV_2ErTyIeVqyaBZK-nPif46TJoCq9h4YdIwBUC1OjbIolw7sUTycfKf2D-oq4uWEU-n3Qx9eOOnhne-zMLa8az8kS0otxEJrSek7ktvcO59SSzqHzjWUd-fz9XEi8CWxSgfLV1vViyFHYFZv0pnbOlb8gtEzax7skMQ" />
                  </div>
                  <span className="text-body-md font-medium text-on-surface">{ongoingBooking.technician} (Certified Tech)</span>
                </div>
              </div>
            </div>
            <div className="mt-lg pt-md border-t border-surface-container-high flex gap-md">
              <button onClick={() => goTo(ROUTES.liveTracking, { state: { selectedTech: ongoingBooking.technician, bookingId: ongoingBooking._id } })} className="flex-1 py-2 rounded-lg bg-secondary-container text-on-secondary-container font-medium text-body-md hover:bg-surface-container-high transition-colors">Track Progress</button>
              <a href="tel:+15550001234" className="flex-1 py-2 rounded-lg bg-surface-container-low text-on-surface-variant font-medium text-body-md hover:bg-surface-container-high transition-colors text-center">Call Shop</a>
            </div>
          </div>
          ) : (
            <div className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low text-center text-on-surface-variant font-body-md">
              No ongoing request. Book a service to get started!
              <div className="mt-md">
                <button onClick={() => goTo(ROUTES.customizeBooking)} className="px-lg py-sm bg-primary text-on-primary rounded-lg font-nav-item text-nav-item hover:bg-primary-container transition-colors">
                  Book Now
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Nearby Companies */}
        <section className="space-y-md">
          <div className="flex justify-between items-center">
<h3 className="font-headline-md text-headline-md text-on-surface">Nearby Companies</h3>
            <button onClick={() => goTo(ROUTES.companies)} className="text-primary font-nav-item hover:underline">See all</button>
          </div>
          {companyLoading ? (
            <div className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low text-center text-on-surface-variant">Loading companies...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {visibleCompanies.slice(0, 4).map((company) => (
                <div key={company._id || company.slug} className="bg-surface-container-lowest rounded-xl shadow-elevation-1 p-md border border-surface-container-low">
                  <div className="flex justify-between items-start gap-md">
                    <div>
                      <h4 className="font-headline-md text-headline-md text-on-surface">{company.name}</h4>
                      <p className="text-sm text-on-surface-variant">{company.location || 'Multiple locations'}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-bold">★ {company.rating || 4.8}</span>
                  </div>
                  <p className="mt-sm text-sm text-on-surface-variant line-clamp-3">{company.description || 'Verified fleet service partner with technicians and live tracking.'}</p>
                  <div className="mt-md flex gap-sm">
                    <button onClick={() => goTo(ROUTES.customizeBooking, { state: { companyId: company.slug || company._id, service: company.services?.[0]?.name || 'Fleet Full Inspection', price: company.services?.[0]?.price || 120 } })} className="flex-1 py-2 rounded-lg bg-primary text-on-primary font-medium">Book Now</button>
                    <button onClick={() => goTo(companyRoute(company.slug || company._id))} className="flex-1 py-2 rounded-lg bg-surface-container-low text-on-surface-variant font-medium">View Details</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Popular Services Grid */}
        <section className="space-y-md">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">Popular Services</h3>
            <button onClick={() => goTo(ROUTES.bookings)} className="text-primary font-nav-item hover:underline">See More</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {/* Service Card 1 */}
            <div className="bg-surface-container-lowest rounded-xl shadow-elevation-1 group hover:shadow-xl transition-all duration-300">
              <div className="h-40 w-full relative overflow-hidden rounded-t-xl">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Emergency Plumbing" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8JxwZt4jbkMkt908JYviDtBKkx-vLt-2B9qBo3Os5lW0X1VhEPsMuuVlBvqV5nIQPiS_izPl1TFeULauwmK5fA5kQ9mY58Kml2TmzHFJ61dDNLxF3R8-ZPoDqiklwqh5IvU7mc_CzMAzhFuY5usjIf9LFGSNniYTrx_P_iZ7zDa43a6rYXCPrAS6sI-g8O_NBrP2IsslD4TCVrDMs2r2veebgWn0KF4n9TKkBHgvyKestjTQ3z5D2nQ" />
                <div className="absolute top-2 right-2 px-sm py-xs bg-surface-container-lowest/80 backdrop-blur-sm rounded-lg text-primary font-bold text-sm">
                  $85/hr
                </div>
              </div>
              <div className="p-md">
                <h4 className="font-headline-md text-headline-md text-on-surface mb-xs">Emergency Plumbing</h4>
                <div className="flex items-center gap-xs mb-md">
                  <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="text-body-md font-bold text-on-surface">4.9</span>
                  <span className="text-body-md text-on-surface-variant">(1.2k reviews)</span>
                </div>
<button 
                  onClick={() => goTo(ROUTES.companies)}
                  className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary-container transition-colors shadow-md"
                >
                  Browse Companies
                </button>
              </div>
            </div>

            {/* Service Card 2 */}
            <div className="bg-surface-container-lowest rounded-xl shadow-elevation-1 group hover:shadow-xl transition-all duration-300">
              <div className="h-40 w-full relative overflow-hidden rounded-t-xl">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Electrical Rewiring" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYZIFtwoU_5a1DsobIJIYqBcSoKZ880EnUaPnMp-fVDIUsI9JAyvWsR69ndnhi-PWiTF3L8osJ7EGTIYPI9lCwk6yYWzeBVHnzlFfu4C3nbdFDSu31pybFaATqfwIZ_OPXVNIZl1oOHCQv3yVVc9UmIVsx_rlsRRt6Y9yw72eZL55pL42zDHYIPdIL4Vf3wweFh73RP2ZCd767cNz4o-rJ_y8JvJG3zx9vMk7zlYWoncOzwag3DNSrtw" />
                <div className="absolute top-2 right-2 px-sm py-xs bg-surface-container-lowest/80 backdrop-blur-sm rounded-lg text-primary font-bold text-sm">
                  $95/hr
                </div>
              </div>
              <div className="p-md">
                <h4 className="font-headline-md text-headline-md text-on-surface mb-xs">Electrical Rewiring</h4>
                <div className="flex items-center gap-xs mb-md">
                  <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="text-body-md font-bold text-on-surface">4.7</span>
                  <span className="text-body-md text-on-surface-variant">(850 reviews)</span>
                </div>
<button 
                  onClick={() => goTo(ROUTES.companies)}
                  className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary-container transition-colors shadow-md"
                >
                  Browse Companies
                </button>
              </div>
            </div>

            {/* Service Card 3 */}
            <div className="hidden lg:block bg-surface-container-lowest rounded-xl shadow-elevation-1 group hover:shadow-xl transition-all duration-300">
              <div className="h-40 w-full relative overflow-hidden rounded-t-xl">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Commercial Cleaning" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3XvTTjcnPwU-dzLCQwlUlzW-AxJXyJEIChp-_yGPShjme07HOuIMXT6B5S0Aaf_ZE2dDuI3nehBn0HcZMu1XxF_xcpYiF6LZo94lcLKRmVGfad6viIJe-WdJxLXTJTKQ4GhWw3Kf02bvzz5pJtRBdRLA7jqLpleUFHRhNcv7Suc9Plz1KMISFY6of52QUNvr8eGIvWOHsK43JoYAgmkVUt3n2u3Ns86-xXe4RdUKb4HITB1lVGdMXNQ" />
                <div className="absolute top-2 right-2 px-sm py-xs bg-surface-container-lowest/80 backdrop-blur-sm rounded-lg text-primary font-bold text-sm">
                  $60/hr
                </div>
              </div>
              <div className="p-md">
                <h4 className="font-headline-md text-headline-md text-on-surface mb-xs">Commercial Cleaning</h4>
                <div className="flex items-center gap-xs mb-md">
                  <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="text-body-md font-bold text-on-surface">4.8</span>
                  <span className="text-body-md text-on-surface-variant">(2.4k reviews)</span>
                </div>
<button 
                  onClick={() => goTo(ROUTES.companies)}
                  className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary-container transition-colors shadow-md"
                >
                  Browse Companies
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* NavigationDrawer — rendered via Sidebar component */}
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-container-margin py-sm bg-surface shadow-[0_-4px_16px_0_rgba(11,29,45,0.12)] rounded-t-xl md:hidden">
        {BOTTOM_NAV.map((item) => {
          const active = routerLocation.pathname === item.to;
          return (
            <a
              key={item.label}
              href={item.to}
              onClick={(e) => { e.preventDefault(); goTo(item.to); }}
              className={`flex flex-col items-center justify-center px-4 py-1 transition-all duration-150 ${
                active
                  ? 'bg-secondary-container text-on-secondary-container rounded-xl scale-95'
                  : 'text-on-secondary-fixed-variant hover:bg-surface-container-high'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-nav-item text-[10px] mt-0.5">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Contextual FAB */}
      <button onClick={() => goTo(ROUTES.customizeBooking)} className="fixed right-6 bottom-24 md:bottom-12 z-40 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all">
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
}

export default CustomerDashboard;
