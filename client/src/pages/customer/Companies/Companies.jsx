import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES, CATEGORIES, companyRoute } from '../../../constants';
import api from '../../../services/api';

const FALLBACK_CITIES = ['All', 'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar'];

const FALLBACK_AREAS = {
  Lahore:     ['Gulberg', 'DHA', 'Model Town', 'Johar Town', 'Bahria Town', 'Liberty', 'Cantt'],
  Karachi:    ['Clifton', 'DHA', 'Gulshan-e-Iqbal', 'Saddar', 'PECHS', 'Nazimabad', 'Korangi'],
  Islamabad:  ['F-7', 'F-8', 'F-10', 'G-9', 'G-10', 'Blue Area', 'I-8'],
  Rawalpindi: ['Saddar', 'Satellite Town', 'Bahria Town', 'Gulraiz', 'Chaklala', 'Westridge'],
  Faisalabad: ['Madina Town', 'Canal Road', 'Gulberg', 'People\'s Colony', 'Dijkot Road'],
  Multan:     ['Gulgasht', 'Shah Rukn-e-Alam', 'Cantt', 'Bosan Road', 'Qasim Bela'],
  Peshawar:   ['Hayatabad', 'University Town', 'Saddar', 'Cantt', 'Gulbahar'],
};

// Demo companies (shown when API returns nothing)
const DEMO_COMPANIES = [
  {
    _id: 'demo-1', slug: 'swiftfleet', name: 'SwiftFleet Services',
    city: 'Lahore', areas: ['DHA', 'Gulberg', 'Johar Town'],
    location: 'DHA Phase 5, Lahore',
    category: 'fleet', service: 'Fleet Inspection',
    services: [{ name: 'Fleet Full Inspection', price: 120 }, { name: 'Express Oil Change', price: 80 }],
    description: 'Pakistan\'s leading fleet maintenance company with certified technicians and live tracking.',
    rating: 4.9,
  },
  {
    _id: 'demo-2', slug: 'autopro-lahore', name: 'AutoPro Lahore',
    city: 'Lahore', areas: ['Cantt', 'Model Town'],
    location: 'Model Town, Lahore',
    category: 'mechanical', service: 'Engine Diagnostics',
    services: [{ name: 'Engine Diagnostics', price: 150 }, { name: 'Brake Service', price: 95 }],
    description: 'Expert engine diagnostics and mechanical repair for all vehicle types.',
    rating: 4.7,
  },
  {
    _id: 'demo-3', slug: 'karachi-plumbers', name: 'KHI Master Plumbers',
    city: 'Karachi', areas: ['Clifton', 'DHA', 'PECHS'],
    location: 'Clifton Block 5, Karachi',
    category: 'plumbing', service: 'Plumbing',
    services: [{ name: 'Emergency Plumbing', price: 85 }, { name: 'Pipe Repair', price: 60 }],
    description: 'Fast emergency plumbing response anywhere in Karachi within 45 minutes.',
    rating: 4.8,
  },
  {
    _id: 'demo-4', slug: 'islamabad-hvac', name: 'Capital HVAC Solutions',
    city: 'Islamabad', areas: ['F-7', 'F-8', 'Blue Area'],
    location: 'F-7 Markaz, Islamabad',
    category: 'hvac', service: 'HVAC Maintenance',
    services: [{ name: 'AC Installation', price: 200 }, { name: 'HVAC Maintenance', price: 130 }],
    description: 'Certified HVAC engineers for residential and commercial cooling systems.',
    rating: 4.6,
  },
  {
    _id: 'demo-5', slug: 'lahore-electric', name: 'Lahore Power Electric',
    city: 'Lahore', areas: ['Gulberg', 'Liberty', 'Bahria Town'],
    location: 'Gulberg III, Lahore',
    category: 'electrical', service: 'Electrical',
    services: [{ name: 'Electrical Rewiring', price: 95 }, { name: 'Solar Panel Install', price: 350 }],
    description: 'Licensed master electricians for all wiring, solar, and electrical safety needs.',
    rating: 4.8,
  },
  {
    _id: 'demo-6', slug: 'clean-pro-khi', name: 'CleanPro Karachi',
    city: 'Karachi', areas: ['Gulshan-e-Iqbal', 'Nazimabad', 'Saddar'],
    location: 'Gulshan-e-Iqbal, Karachi',
    category: 'cleaning', service: 'Cleaning',
    services: [{ name: 'Commercial Cleaning', price: 60 }, { name: 'Deep Clean', price: 110 }],
    description: 'Professional commercial and residential deep cleaning with eco-friendly products.',
    rating: 4.5,
  },
];

function Companies() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters — initialise from URL params so links from dashboard pre-filter correctly
  const [query, setQuery]         = useState(searchParams.get('q') || '');
  const [city, setCity]           = useState(searchParams.get('city') || 'All');
  const [area, setArea]           = useState(searchParams.get('area') || 'All');
  const [category, setCategory]   = useState(searchParams.get('category') || 'All');

  const [companies, setCompanies]       = useState([]);
  const [cities, setCities]             = useState(FALLBACK_CITIES);
  const [areasByCity, setAreasByCity]   = useState(FALLBACK_AREAS);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Sync URL params when filters change
  useEffect(() => {
    const params = {};
    if (query)           params.q        = query;
    if (city !== 'All')  params.city     = city;
    if (area !== 'All')  params.area     = area;
    if (category !== 'All') params.category = category;
    setSearchParams(params, { replace: true });
  }, [query, city, area, category]);

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/companies');
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

        setCompanies(fetched.length ? fetched : DEMO_COMPANIES);
        if (response.cities?.length) setCities(['All', ...response.cities]);
        if (response.areasByCity) setAreasByCity({ ...FALLBACK_AREAS, ...response.areasByCity });
      } catch {
        let localCompanies = [];
        try {
          localCompanies = JSON.parse(localStorage.getItem('fleetos-registered-companies') || '[]');
        } catch (e) {}

        const combined = [...localCompanies, ...DEMO_COMPANIES];
        setCompanies(combined);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const selectCity = (c) => { setCity(c); setArea('All'); };
  const selectCategory = (c) => setCategory((prev) => (prev === c ? 'All' : c));

  const availableAreas = city === 'All' ? [] : (areasByCity[city] || []);

  const filtered = companies.filter((co) => {
    const matchCity     = city === 'All'     || (co.city || '').toLowerCase() === city.toLowerCase();
    const matchArea     = area === 'All'     ||
      (co.areas || []).some((a) => a.toLowerCase().includes(area.toLowerCase())) ||
      (co.location || '').toLowerCase().includes(area.toLowerCase());
    const matchCategory = category === 'All' ||
      (co.category || '').toLowerCase() === category.toLowerCase() ||
      (co.services || []).some((s) => (s.name || '').toLowerCase().includes(category.toLowerCase()));
    const haystack = `${co.name} ${co.location} ${co.city} ${co.service} ${co.category} ${(co.areas || []).join(' ')} ${(co.services || []).map((s) => s.name).join(' ')}`.toLowerCase();
    const matchQuery    = !query.trim() || haystack.includes(query.trim().toLowerCase());
    return matchCity && matchArea && matchCategory && matchQuery;
  });

  // Group filtered companies by city for the "by location" view
  const groupedByCity = filtered.reduce((acc, co) => {
    const key = co.city || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(co);
    return acc;
  }, {});

  const goToDetails  = (co) => navigate(companyRoute(co.slug || co._id));
  const goToBooking  = (co) => navigate(ROUTES.customizeBooking, {
    state: {
      companyId:   co.slug || co._id,
      companyName: co.name,
      service:     co.services?.[0]?.name || 'Fleet Full Inspection',
      price:       co.services?.[0]?.price || 120,
    },
  });

  const activeFilters = [
    city !== 'All'     && city,
    area !== 'All'     && area,
    category !== 'All' && CATEGORIES.find((c) => c.value === category)?.label,
  ].filter(Boolean);

  return (
    <div className="bg-background text-on-surface min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm">
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Browse Companies</h1>
        </div>
        <button onClick={() => navigate(ROUTES.dashboard)} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant">home</span>
        </button>
      </header>

      <main className="pt-24 px-container-margin max-w-7xl mx-auto space-y-lg">

        {/* ── Search bar ── */}
        <section className="space-y-sm">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-on-surface-variant">search</span>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-body-md transition-all shadow-elevation-1 outline-none"
              placeholder="Search by name, city, area or service…"
              type="text"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute inset-y-0 right-4 flex items-center text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* ── Category filter chips ── */}
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">Filter by service</p>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              <button
                onClick={() => setCategory('All')}
                className={`shrink-0 px-4 py-2 rounded-full font-nav-item text-nav-item transition-all flex items-center gap-xs ${
                  category === 'All'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">apps</span>
                All Services
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => selectCategory(cat.value)}
                  className={`shrink-0 px-4 py-2 rounded-full font-nav-item text-nav-item transition-all flex items-center gap-xs ${
                    category === cat.value
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── City chips ── */}
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">Filter by city</p>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {cities.map((c) => (
                <button
                  key={c}
                  onClick={() => selectCity(c)}
                  className={`shrink-0 px-4 py-2 rounded-full font-nav-item text-nav-item transition-all ${
                    city === c
                      ? 'bg-secondary-container text-on-secondary-container font-bold'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* ── Area chips (only when a city is selected) ── */}
          {city !== 'All' && availableAreas.length > 0 && (
            <div className="space-y-1">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                {city} — choose your area
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setArea('All')}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-nav-item transition-all border ${
                    area === 'All'
                      ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
                  }`}
                >
                  All areas
                </button>
                {availableAreas.map((a) => (
                  <button
                    key={a}
                    onClick={() => setArea(a)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-nav-item transition-all border ${
                      area === a
                        ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Active filter pills + result count ── */}
        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-sm text-on-surface-variant">
            {loading ? 'Loading…' : `${filtered.length} compan${filtered.length === 1 ? 'y' : 'ies'} found`}
          </p>
          {activeFilters.map((f) => (
            <span key={f} className="inline-flex items-center gap-xs px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold">
              {f}
              <button onClick={() => {
                if (f === city)        selectCity('All');
                else if (f === area)   setArea('All');
                else                   setCategory('All');
              }}>
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            </span>
          ))}
          {activeFilters.length > 0 && (
            <button
              onClick={() => { selectCity('All'); setArea('All'); setCategory('All'); setQuery(''); }}
              className="text-xs text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="bg-error-container text-on-error-container p-md rounded-xl text-sm flex items-center gap-sm">
            <span className="material-symbols-outlined text-[18px]">info</span>
            {error}
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-surface-container-lowest rounded-xl p-lg shadow-elevation-1 border border-surface-container-low animate-pulse">
                <div className="w-full h-32 bg-surface-container-high rounded-lg mb-md" />
                <div className="h-4 bg-surface-container-high rounded w-2/3 mb-2" />
                <div className="h-3 bg-surface-container-high rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <div className="bg-surface-container-lowest p-xl rounded-xl shadow-elevation-1 border border-surface-container-low text-center">
            <span className="material-symbols-outlined text-4xl text-outline mb-sm block">storefront</span>
            <p className="font-body-lg text-on-surface">No companies found</p>
            <p className="font-body-md text-on-surface-variant mt-xs">Try a different city, area, category or search term.</p>
            <button
              onClick={() => { selectCity('All'); setArea('All'); setCategory('All'); setQuery(''); }}
              className="mt-lg px-xl py-sm bg-primary text-on-primary rounded-xl font-nav-item hover:bg-primary-container transition-colors"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* ── Results ── */}
        {!loading && filtered.length > 0 && (() => {
          // When filtered to a specific city show a flat grid; otherwise group by city
          const showGrouped = city === 'All' && !query.trim() && category === 'All';

          if (showGrouped) {
            return (
              <div className="space-y-2xl">
                {Object.entries(groupedByCity).map(([cityName, list]) => (
                  <section key={cityName}>
                    {/* City section header */}
                    <div className="flex items-center gap-md mb-md">
                      <span className="material-symbols-outlined text-primary">location_city</span>
                      <h2 className="font-headline-md text-headline-md text-on-surface">{cityName}</h2>
                      <span className="text-sm text-on-surface-variant">({list.length} {list.length === 1 ? 'company' : 'companies'})</span>
                      <div className="flex-1 h-px bg-surface-container-low" />
                      <button
                        onClick={() => selectCity(cityName)}
                        className="text-sm text-primary hover:underline shrink-0"
                      >
                        View all in {cityName}
                      </button>
                    </div>
                    <CompanyGrid companies={list} onBook={goToBooking} onDetails={goToDetails} onChat={(co) => navigate(`${ROUTES.chat}/${co.slug || co._id}`)} />
                  </section>
                ))}
              </div>
            );
          }

          // Filtered view — single flat grid with a category header if one is selected
          return (
            <div className="space-y-md">
              {category !== 'All' && (
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary">
                    {CATEGORIES.find((c) => c.value === category)?.icon || 'category'}
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    {CATEGORIES.find((c) => c.value === category)?.label} Services
                    {city !== 'All' && ` in ${city}`}
                  </h2>
                </div>
              )}
              <CompanyGrid companies={filtered} onBook={goToBooking} onDetails={goToDetails} onChat={(co) => navigate(`${ROUTES.chat}/${co.slug || co._id}`)} />
            </div>
          );
        })()}

      </main>
    </div>
  );
}

// ── Reusable company card grid ──────────────────────────────────────────────
function CompanyGrid({ companies, onBook, onDetails, onChat }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
      {companies.map((co) => (
        <CompanyCard key={co._id || co.slug} company={co} onBook={onBook} onDetails={onDetails} onChat={onChat} />
      ))}
    </div>
  );
}

function CompanyCard({ company: co, onBook, onDetails, onChat }) {
  const categoryMeta = CATEGORIES.find((c) => c.value === (co.category || '').toLowerCase());

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-elevation-1 overflow-hidden border border-surface-container-low flex flex-col hover:shadow-elevation-2 transition-shadow">
      {/* Hero */}
      <div className="h-40 w-full bg-surface-container-high overflow-hidden relative">
        {co.heroImage ? (
          <img className="w-full h-full object-cover" alt={co.name} src={co.heroImage} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary-container text-on-primary-container">
            <span className="material-symbols-outlined text-5xl">
              {categoryMeta?.icon || 'local_shipping'}
            </span>
          </div>
        )}
        {/* Category badge */}
        {categoryMeta && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-xs px-2 py-1 rounded-full bg-surface/80 backdrop-blur-sm text-on-surface text-xs font-semibold">
            <span className="material-symbols-outlined text-[12px]">{categoryMeta.icon}</span>
            {categoryMeta.label}
          </span>
        )}
      </div>

      <div className="p-md flex flex-col flex-1">
        <div className="flex justify-between items-start gap-md">
          <div className="min-w-0">
            <h3 className="font-headline-md text-headline-md text-on-surface truncate">{co.name}</h3>
            <p className="text-sm text-on-surface-variant flex items-center gap-xs mt-0.5">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {co.location || co.city || 'Pakistan'}
            </p>
          </div>
          <span className="px-2 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-bold shrink-0">
            ★ {co.rating || 4.5}
          </span>
        </div>

        <p className="mt-sm text-sm text-on-surface-variant line-clamp-2 flex-1">{co.description}</p>

        {/* Areas served */}
        {co.areas?.length > 0 && (
          <div className="mt-md flex flex-wrap gap-xs">
            {co.areas.slice(0, 3).map((a) => (
              <span key={a} className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-xs">
                {a}
              </span>
            ))}
            {co.areas.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-xs">
                +{co.areas.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Services preview */}
        {co.services?.length > 0 && (
          <div className="mt-sm flex flex-wrap gap-xs">
            {co.services.slice(0, 2).map((s) => (
              <span key={s.name} className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-xs">
                {s.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-md flex gap-xs">
          <button
            onClick={() => onBook(co)}
            className="flex-1 py-2 rounded-lg bg-primary text-on-primary font-medium text-sm hover:bg-primary-container transition-colors"
          >
            Book Now
          </button>
          <button
            onClick={() => onChat(co)}
            className="py-2 px-3 rounded-lg bg-secondary-container text-on-secondary-container font-medium text-sm hover:bg-surface-container-high transition-colors flex items-center gap-xs"
            title="Chat with company"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
          </button>
          <button
            onClick={() => onDetails(co)}
            className="flex-1 py-2 rounded-lg bg-surface-container-low text-on-surface-variant font-medium text-sm hover:bg-surface-container-high transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}

export default Companies;
