import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES, CATEGORIES, companyRoute } from '../../../constants';
import api from '../../../services/api';
import { io } from 'socket.io-client';
import { getActiveSessionToken } from '../../../services/api';
import CustomerTopNav from '../../../components/customer/CustomerTopNav';

function Companies() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters — initialise from URL params so links from dashboard pre-filter correctly
  const [query, setQuery]         = useState(searchParams.get('q') || '');
  const [city, setCity]           = useState(searchParams.get('city') || 'All');
  const [area, setArea]           = useState(searchParams.get('area') || 'All');
  const [category, setCategory]   = useState(searchParams.get('category') || 'All');

  const [companies, setCompanies]       = useState([]);
  const [cities, setCities]             = useState(['All']);
  const [areasByCity, setAreasByCity]   = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const [hasMore, setHasMore]           = useState(false);
  const [carouselCompanies, setCarouselCompanies] = useState([]);
  const [carouselLoading, setCarouselLoading] = useState(true);
  const [carouselPage, setCarouselPage] = useState(1);
  const [carouselHasMore, setCarouselHasMore] = useState(false);
  const [marketplaceRevision, setMarketplaceRevision] = useState(0);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      auth: { token: getActiveSessionToken() },
      transports: ['websocket', 'polling'],
    });
    socket.on('marketplace:updated', () => {
      setPage(1);
      setMarketplaceRevision((value) => value + 1);
    });
    return () => socket.disconnect();
  }, []);

  // Sync URL params when filters change
  useEffect(() => {
    const params = {};
    if (query)           params.q        = query;
    if (city !== 'All')  params.city     = city;
    if (area !== 'All')  params.area     = area;
    if (category !== 'All') params.category = category;
    setSearchParams(params, { replace: true });
  }, [query, city, area, category, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
    const fetchCompanies = async () => {
      if (page === 1) setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '120',
        });
        if (query.trim()) params.set('search', query.trim());
        if (city !== 'All') params.set('city', city);
        if (area !== 'All') params.set('area', area);
        if (category !== 'All') params.set('category', category);
        const response = await api.get(`/companies?${params.toString()}`, { noCache: true });
        const fetched = response.companies || [];
        setCompanies((current) => {
          if (page === 1) return fetched;
          const seen = new Set(current.map((company) => company._id || company.slug));
          return [...current, ...fetched.filter((company) => !seen.has(company._id || company.slug))];
        });
        setTotal(Number(response.total || fetched.length));
        setHasMore(Boolean(response.hasMore));
        if (response.cities?.length) setCities(['All', ...response.cities]);
        if (response.areasByCity) setAreasByCity(response.areasByCity);
      } catch (requestError) {
        setError(requestError.message);
        if (page === 1) setCompanies([]);
      } finally {
        if (page === 1) setLoading(false);
      }
    };
    fetchCompanies();
    }, query.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query, city, area, category, page, marketplaceRevision]);

  useEffect(() => {
    let cancelled = false;
    const fetchCarouselCompanies = async () => {
      setCarouselLoading(true);
      try {
        const response = await api.get('/companies?page=1&limit=120', { noCache: true });
        if (!cancelled) {
          setCarouselCompanies(response.companies || []);
          setCarouselPage(1);
          setCarouselHasMore(Boolean(response.hasMore));
        }
      } catch {
        if (!cancelled) setCarouselCompanies([]);
      } finally {
        if (!cancelled) setCarouselLoading(false);
      }
    };
    fetchCarouselCompanies();
    return () => {
      cancelled = true;
    };
  }, [marketplaceRevision]);

  const loadMoreCarouselCompanies = useCallback(async () => {
    if (carouselLoading || !carouselHasMore) return;
    const nextPage = carouselPage + 1;
    setCarouselLoading(true);
    try {
      const response = await api.get(`/companies?page=${nextPage}&limit=120`, { noCache: true });
      const batch = response.companies || [];
      setCarouselCompanies((current) => {
        const seen = new Set(current.map((company) => company._id || company.slug));
        return [...current, ...batch.filter((company) => !seen.has(company._id || company.slug))];
      });
      setCarouselPage(nextPage);
      setCarouselHasMore(Boolean(response.hasMore));
    } catch {
      // Keep the already loaded slideshow available if a later page fails.
    } finally {
      setCarouselLoading(false);
    }
  }, [carouselHasMore, carouselLoading, carouselPage]);

  const updateQuery = (value) => { setQuery(value); setPage(1); };
  const selectCity = (value) => { setCity(value); setArea('All'); setPage(1); };
  const selectArea = (value) => { setArea(value); setPage(1); };
  // A service chip is a filter, not a toggle: clicking an already selected
  // service keeps that filter active. "All Services" is the single clear action.
  const selectCategory = (selectedCategory) => { setCategory(selectedCategory); setPage(1); };
  const resetFilters = () => {
    setQuery('');
    setCity('All');
    setArea('All');
    setCategory('All');
    setPage(1);
  };

  const availableAreas = city === 'All' ? [] : (areasByCity[city] || []);

  const filtered = companies;

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
      service:     co.services?.[0]?.name || 'Preventive Maintenance',
      price:       co.services?.[0]?.price || 0,
    },
  });

  const activeFilters = [
    city !== 'All'     && city,
    area !== 'All'     && area,
    category !== 'All' && CATEGORIES.find((c) => c.value === category)?.label,
  ].filter(Boolean);

  return (
    <div className="client-dashboard-shell text-[#0D1B2A] min-h-screen pb-32">
      <CustomerTopNav title="Browse Companies" subtitle="Discover approved products, services, support, and offers across Pakistan." showBack={false} />

      <main className="pt-12 px-5 md:px-8 max-w-7xl mx-auto space-y-8">
        <ShowcaseCard companies={carouselCompanies.length ? carouselCompanies : companies} loading={carouselLoading && !companies.length} total={total} onNeedMore={loadMoreCarouselCompanies} onExplore={() => document.getElementById('company-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />

        {/* ── Search bar ── */}
        <section className="space-y-sm client-entrance-panel">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-600">search</span>
            </div>
            <input
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 rounded-xl text-sm font-semibold transition-all shadow-sm outline-none"
              placeholder="Search by name, city, area or service…"
              type="text"
            />
            {query && (
              <button onClick={() => updateQuery('')} className="absolute inset-y-0 right-4 flex items-center text-slate-600 hover:text-slate-950">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* ── Category filter chips ── */}
          <div>
            <p className="font-label-sm text-label-sm text-slate-600 uppercase tracking-wider mb-sm">Filter by service</p>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              <button
                onClick={() => selectCategory('All')}
                aria-pressed={category === 'All'}
                className={`shrink-0 px-4 py-2 rounded-full font-nav-item text-nav-item transition-all flex items-center gap-xs ${
                  category === 'All'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">apps</span>
                All Services
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => selectCategory(cat.value)}
                  aria-pressed={category === cat.value}
                  className={`shrink-0 px-4 py-2 rounded-full font-nav-item text-nav-item transition-all flex items-center gap-xs ${
                    category === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            <p className="font-label-sm text-label-sm text-slate-600 uppercase tracking-wider mb-sm">Filter by city</p>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {cities.map((c) => (
                <button
                  key={c}
                  onClick={() => selectCity(c)}
                  className={`shrink-0 px-4 py-2 rounded-full font-nav-item text-nav-item transition-all ${
                    city === c
                      ? 'bg-secondary-container text-on-secondary-container font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
              <p className="font-label-sm text-label-sm text-slate-600 uppercase tracking-wider">
                {city} — choose your area
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => selectArea('All')}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-nav-item transition-all border ${
                    area === 'All'
                      ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  All areas
                </button>
                {availableAreas.map((a) => (
                  <button
                    key={a}
                    onClick={() => selectArea(a)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-nav-item transition-all border ${
                      area === a
                        ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
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
          <div className="flex flex-wrap items-center gap-sm client-entrance-panel">
          <p className="text-sm text-slate-600">
            {loading && page === 1 ? 'Loading…' : `${total || filtered.length} compan${(total || filtered.length) === 1 ? 'y' : 'ies'} found`}
            {filtered.length > 0 && total > filtered.length ? ` · showing ${filtered.length}` : ''}
          </p>
          {activeFilters.map((f) => (
            <span key={f} className="inline-flex items-center gap-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              {f}
              <button onClick={() => {
                if (f === city)        selectCity('All');
                else if (f === area)   selectArea('All');
                else                   selectCategory('All');
              }}>
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            </span>
          ))}
          {activeFilters.length > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 hover:underline"
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
              <div key={n} className="bg-slate-100est rounded-xl p-lg shadow-elevation-1 border border-surface-container-low animate-pulse">
                <div className="w-full h-32 bg-slate-200 rounded-lg mb-md" />
                <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white p-xl rounded-xl shadow-sm border border-slate-200 text-center">
            <span className="material-symbols-outlined text-4xl text-outline mb-sm block">storefront</span>
            <p className="font-body-lg text-slate-950">No companies found</p>
            <p className="font-body-md text-slate-600 mt-xs">Approved, unblocked companies appear here. Try clearing filters or approving the company in Super Admin if it is hidden.</p>
            <button
              onClick={resetFilters}
              className="mt-lg px-xl py-sm bg-blue-600 text-white rounded-xl font-nav-item hover:bg-primary-container transition-colors"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* ── Results ── */}
        <div id="company-results" />
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
                      <span className="material-symbols-outlined text-blue-600">location_city</span>
                      <h2 className="font-headline-md text-headline-md text-slate-950">{cityName}</h2>
                      <span className="text-sm text-slate-600">({list.length} {list.length === 1 ? 'company' : 'companies'})</span>
                      <div className="flex-1 h-px bg-slate-100" />
                      <button
                        onClick={() => selectCity(cityName)}
                        className="text-sm text-blue-600 hover:underline shrink-0"
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
                  <span className="material-symbols-outlined text-blue-600">
                    {CATEGORIES.find((c) => c.value === category)?.icon || 'category'}
                  </span>
                  <h2 className="font-headline-md text-headline-md text-slate-950">
                    {CATEGORIES.find((c) => c.value === category)?.label} Services
                    {city !== 'All' && ` in ${city}`}
                  </h2>
                </div>
              )}
              <CompanyGrid companies={filtered} onBook={goToBooking} onDetails={goToDetails} onChat={(co) => navigate(`${ROUTES.chat}/${co.slug || co._id}`)} />
            </div>
          );
        })()}

        {!loading && hasMore && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setPage((current) => current + 1)}
              className="px-6 py-3 rounded-2xl bg-[#0D1B2A] text-white text-sm font-black hover:bg-[#1B263B] transition-colors shadow-sm"
            >
              Load more companies
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

// ── Reusable company card grid ──────────────────────────────────────────────
function CompanyGrid({ companies, onBook, onDetails, onChat }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
      {companies.map((co, index) => (
        <CompanyCard key={co._id || co.slug} company={co} index={index} onBook={onBook} onDetails={onDetails} onChat={onChat} />
      ))}
    </div>
  );
}

function CompanyCard({ company: co, index = 0, onBook, onDetails, onChat }) {
  const primaryService = co.services?.[0];
  const companyDescription = String(co.description || '').trim();
  // The company record is the source of truth for client discovery.  If a
  // company has not added services yet, its own description still determines
  // the listing's visual context instead of a static marketplace category.
  const listingContext = [primaryService?.category, primaryService?.name, co.category, companyDescription]
    .filter(Boolean)
    .join(' ');
  const serviceCategory = primaryService?.category || co.category || companyDescription || 'Marketplace Service';
  const categoryMeta = CATEGORIES.find((c) => c.value === String(serviceCategory).toLowerCase());
  const coverImage = companyBannerImage(co, listingContext, index);
  const servicePreview = co.services?.length
    ? co.services.slice(0, 2)
    : [];

  return (
    <div className="client-company-card client-motion-card bg-white rounded-[30px] shadow-sm overflow-hidden border border-[#E0E1DD] flex flex-col hover:shadow-elevation-2 transition-all" style={{ '--client-card-delay': `${Math.min(index, 8) * 70}ms` }}>
      {/* Hero */}
      <div className="h-44 w-full bg-[#E0E1DD] overflow-hidden relative">
        <img
          className="client-company-cover w-full h-full object-cover"
          alt={co.name}
          src={coverImage}
          onError={(event) => {
            const image = event.currentTarget;
            if (image.dataset.fallback === 'secondary') {
              image.onerror = null;
              image.src = companyRealPhoto(co, serviceCategory, index, 'general');
              return;
            };
            image.dataset.fallback = 'secondary';
            image.src = companyRealPhoto(co, serviceCategory, index, 'secondary');
          }}
        />
        {/* Category badge */}
        {categoryMeta && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-xs px-2 py-1 rounded-full bg-surface/80 backdrop-blur-sm text-slate-950 text-xs font-semibold">
            <span className="material-symbols-outlined text-[12px]">{categoryMeta.icon}</span>
            {categoryMeta.label}
          </span>
        )}
      </div>

      <div className="p-md flex flex-col flex-1">
        <div className="flex justify-between items-start gap-md">
          <div className="min-w-0">
            <h3 className="font-headline-md text-headline-md text-slate-950 truncate">{co.name}</h3>
            <p className="text-sm text-slate-600 flex items-center gap-xs mt-0.5">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {co.location || co.city || 'Pakistan'}
            </p>
          </div>
          <span className="px-2 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-bold shrink-0">
            ★ {co.rating || 4.5}
          </span>
        </div>

        <p className="mt-sm text-sm leading-6 text-[#415A77] line-clamp-4 flex-1" title={companyDescription}>
          {companyDescription || 'This company has not added a public description yet.'}
        </p>

        {/* Areas served */}
        {co.areas?.length > 0 && (
          <div className="mt-md flex flex-wrap gap-xs">
            {co.areas.slice(0, 3).map((a) => (
              <span key={a} className="px-2 py-0.5 rounded-full bg-surface-container text-slate-600 text-xs">
                {a}
              </span>
            ))}
            {co.areas.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-slate-600 text-xs">
                +{co.areas.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Services preview */}
        {servicePreview.length > 0 && (
          <div className="mt-sm flex flex-wrap gap-xs">
            {servicePreview.map((s) => (
              <span key={s.name} className="px-2 py-0.5 rounded-full bg-[#E0E1DD] text-[#1B263B] text-xs font-semibold">
                {s.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-md flex gap-xs">
          <button
            onClick={() => onBook(co)}
            className="flex-1 py-2 rounded-2xl bg-[#0D1B2A] text-white font-medium text-sm hover:bg-[#1B263B] transition-colors"
          >
            Book Now
          </button>
          <button
            onClick={() => onChat(co)}
            className="py-2 px-3 rounded-2xl bg-[#E0E1DD] text-[#0D1B2A] font-medium text-sm hover:bg-[#778DA9]/30 transition-colors flex items-center gap-xs"
            title="Chat with company"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
          </button>
          <button
            onClick={() => onDetails(co)}
            className="flex-1 py-2 rounded-2xl bg-[#E0E1DD]/70 text-[#1B263B] font-medium text-sm hover:bg-[#778DA9]/30 transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({ companies, loading = false, total, onExplore, onNeedMore }) {
  const featured = useMemo(() => companies.filter(Boolean), [companies]);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex = featured.length ? activeIndex % featured.length : 0;

  useEffect(() => {
    if (featured.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % featured.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [featured.length]);

  useEffect(() => {
    if (featured.length > 1 && featured.length - safeActiveIndex <= 8) onNeedMore?.();
  }, [safeActiveIndex, featured.length, onNeedMore]);

  const activeCompany = featured[safeActiveIndex];
  const activeService = activeCompany?.services?.[0]?.name || activeCompany?.category || 'Verified service';

  return (
    <section className="client-showcase-card client-showcase-animated rounded-[38px] p-6 md:p-8 shadow-[0_32px_90px_rgba(13,27,42,.22)] overflow-hidden relative">
      <div className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-[#778DA9]/30 blur-2xl" />
      <div className="relative grid lg:grid-cols-[1.1fr_.9fr] gap-8 items-center">
        <div className="client-showcase-copy">
          <span className="client-showcase-badge client-stagger-item inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-black text-[#E0E1DD]">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Verified service marketplace
          </span>
          <h2 className="client-showcase-title client-stagger-item mt-5 text-3xl md:text-5xl font-black leading-tight tracking-tight">Find the right company without the messy searching.</h2>
          <p className="client-showcase-subtitle client-stagger-item mt-4 text-sm md:text-base text-[#E0E1DD]/85 max-w-2xl leading-7">Browse approved Pakistani companies, compare real services, chat before booking, track work, pay, and review from your own client account.</p>
          <div className="client-stagger-item mt-6 flex flex-wrap gap-3">
            <button onClick={onExplore} className="client-hero-primary-button px-5 py-3 rounded-2xl text-sm font-black transition-colors">Explore companies</button>
            <span className="client-showcase-count px-5 py-3 rounded-2xl bg-white/10 border border-white/15 text-sm font-black">{total || companies.length} approved listings</span>
          </div>
        </div>
        <div className="client-carousel-stage" aria-live="polite">
          {loading ? (
            <div className="client-carousel-slide client-carousel-loading bg-white/10 border border-white/15 rounded-[26px] p-3 flex items-center gap-4">
              <span className="w-20 h-16 rounded-2xl bg-white/15 block" />
              <div className="min-w-0 flex-1 space-y-2">
                <span className="block h-4 w-3/4 rounded-full bg-white/15" />
                <span className="block h-3 w-1/2 rounded-full bg-white/10" />
              </div>
              <span className="w-8 h-8 rounded-full bg-white/10" />
            </div>
          ) : activeCompany ? (
            <button key={activeCompany._id || activeCompany.slug || safeActiveIndex} onClick={() => onExplore?.()} className="client-carousel-slide client-on-dark-card group text-left bg-white/10 hover:bg-white/15 border border-white/15 rounded-[26px] p-3 flex items-center gap-4 transition-all">
              <img
                src={companyBannerImage(activeCompany, activeCompany.services?.[0]?.category, safeActiveIndex)}
                alt={activeCompany.name}
                className="client-carousel-image w-20 h-16 rounded-2xl object-cover border border-white/10"
                onError={(event) => {
                  event.currentTarget.onerror = () => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = companyRealPhoto(activeCompany, activeService, safeActiveIndex, 'general');
                  };
                  event.currentTarget.src = companyRealPhoto(activeCompany, activeService, safeActiveIndex, 'secondary');
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="client-carousel-title text-sm font-black truncate">{activeCompany.name}</p>
                <p className="client-carousel-meta text-xs text-[#E0E1DD]/70 truncate">{activeCompany.city || activeCompany.location || 'Pakistan'} · {activeService}</p>
                <p className="client-carousel-meta mt-1 text-[11px] text-[#E0E1DD]/55 truncate">★ {activeCompany.rating || 4.5} · {activeCompany.areas?.[0] || 'Available for service'}</p>
              </div>
              <span className="client-carousel-index w-8 h-8 rounded-full bg-white/10 grid place-items-center text-xs font-black">{safeActiveIndex + 1}</span>
            </button>
          ) : (
            <div className="client-carousel-slide bg-white/10 border border-white/15 rounded-[26px] p-4 text-sm text-[#E0E1DD]/80">
              Approved companies will appear here.
            </div>
          )}
          {featured.length > 1 && (
            <div className="client-carousel-dots" aria-hidden="true">
              {featured.slice(0, 8).map((company, index) => (
                <span key={company._id || company.slug || index} className={index === safeActiveIndex % 8 ? 'is-active' : ''} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function companyBannerImage(company, category = 'Marketplace', index = 0) {
  const existing = company.heroImage || company.gallery?.[0] || '';
  const existingImage = String(existing);
  const looksLikeUploadedImage = existingImage
    && !existingImage.startsWith('data:image/svg')
    && !existingImage.includes('images.unsplash.com')
    && !existingImage.includes('lh3.googleusercontent.com/aida-public');
  if (looksLikeUploadedImage) return existing;
  return companyRealPhoto(company, category, index);
}

function companyRealPhoto(company, category = 'Marketplace', index = 0, source = 'primary') {
  const key = `${company._id || company.slug || company.name || ''} ${company.category || ''} ${category || ''} ${company.services?.map((service) => service.name).join(' ') || ''} ${index}`.toLowerCase();
  const imageKey = serviceImageKey(key);
  const hash = Math.abs(Array.from(`${key} ${source}`).reduce((sum, char) => ((sum << 5) - sum + char.charCodeAt(0)) | 0, 0));
  const query = servicePhotoQueries[imageKey] || servicePhotoQueries.general;
  if (source === 'secondary') return `https://loremflickr.com/900/540/${query.secondary}?lock=${hash}`;
  if (source === 'general') return `https://picsum.photos/seed/fleetos-service-${hash}/900/540`;
  return `https://source.unsplash.com/900x540/?${query.primary}&sig=${hash}`;
}

function serviceImageKey(value = '') {
  const key = String(value).toLowerCase();
  if (key.includes('digital') || key.includes('software') || key.includes('web') || key.includes('app') || key.includes('computer') || key.includes('it')) return 'digital';
  if (key.includes('retail') || key.includes('product') || key.includes('shop') || key.includes('store') || key.includes('market')) return 'retail';
  if (key.includes('home') || key.includes('clean') || key.includes('interior') || key.includes('house')) return 'home';
  if (key.includes('install') || key.includes('construction') || key.includes('setup') || key.includes('fit')) return 'installation';
  if (key.includes('repair') || key.includes('support') || key.includes('maintenance') || key.includes('fix') || key.includes('tool')) return 'repair';
  if (key.includes('professional') || key.includes('consult') || key.includes('legal') || key.includes('account') || key.includes('finance')) return 'professional';
  if (key.includes('business') || key.includes('office') || key.includes('corporate')) return 'business';
  return 'general';
}

const servicePhotoQueries = {
  retail: { primary: 'retail-store,products,shopping', secondary: 'retail,store,shopping' },
  installation: { primary: 'installation,construction,tools', secondary: 'construction,tools,worker' },
  repair: { primary: 'repair,tools,workshop', secondary: 'repair,tools,maintenance' },
  home: { primary: 'home-service,cleaning,interior', secondary: 'home,interior,cleaning' },
  business: { primary: 'business-office,team,meeting', secondary: 'business,office,team' },
  digital: { primary: 'software,technology,computer', secondary: 'technology,computer,software' },
  professional: { primary: 'consulting,professional,meeting', secondary: 'consulting,meeting,office' },
  general: { primary: 'service-business,company,team', secondary: 'business,service,team' },
};

export default Companies;



