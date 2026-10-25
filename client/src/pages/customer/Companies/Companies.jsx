import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import { FULFILLMENT, FULFILLMENT_TYPES } from '../../../constants/fulfillment';
import { useIndustries } from '../../../hooks/useIndustries';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { useAuth } from '../../../hooks/useAuth';
import { usePageChrome } from '../../../hooks/usePageChrome';
import CompanyCard from '../../../components/customer/CompanyCard';
import { Alert, EmptyState, SkeletonCards, Spinner } from '../../../components/ui';
import { getGreeting } from '../../../utils/helpers';

const PAGE_SIZE = 24;

function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const id = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(id); }, [value, delay]);
  return debounced;
}

function Companies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [city, setCity] = useState(params.get('city') || '');
  const [area, setArea] = useState(params.get('area') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [industry, setIndustry] = useState(params.get('industry') || '');
  const [fulfillment, setFulfillment] = useState(params.get('fulfillment') || '');
  const { industries } = useIndustries();
  const [pages, setPages] = useState(1);
  const search = useDebounced(query.trim());

  usePageChrome({
    title: `${getGreeting()}, ${String(user?.name || 'there').split(' ')[0]}`,
    subtitle: 'Shops, services, food, health and more: order or book in a few steps.',
    showBack: false,
  });

  useEffect(() => {
    const next = {};
    if (search) next.q = search;
    if (city) next.city = city;
    if (area) next.area = area;
    if (category) next.category = category;
    if (industry) next.industry = industry;
    if (fulfillment) next.fulfillment = fulfillment;
    setParams(next, { replace: true });
  }, [search, city, area, category, industry, fulfillment, setParams]);

  // Start from the first page whenever a filter changes.
  const filterKey = [search, city, area, category, industry, fulfillment].join('\u0000');
  const [pagedFilter, setPagedFilter] = useState(filterKey);
  if (filterKey !== pagedFilter) { setPagedFilter(filterKey); setPages(1); }

  const key = useMemo(() => {
    const qs = new URLSearchParams({ page: '1', limit: String(PAGE_SIZE * pages) });
    if (search) qs.set('search', search);
    if (city) qs.set('city', city);
    if (area) qs.set('area', area);
    if (category) qs.set('category', category);
    if (industry) qs.set('industry', industry);
    if (fulfillment) qs.set('fulfillment', fulfillment);
    return `/companies?${qs.toString()}`;
  }, [search, city, area, category, industry, fulfillment, pages]);

  const { data, error, loading, refreshing, refresh } = useLiveQuery(key, { events: ['marketplace:updated'] });
  const companies = data?.companies || [];
  const cities = data?.cities || [];
  const areas = city ? data?.areasByCity?.[city] || [] : [];
  const total = Number(data?.total || companies.length);
  const filtersActive = Boolean(search || city || area || category || industry || fulfillment);

  const reset = () => { setQuery(''); setCity(''); setArea(''); setCategory(''); setIndustry(''); setFulfillment(''); };
  const book = (company) => navigate(ROUTES.customizeBooking, { state: { companyId: company.slug || company._id, companyName: company.name, service: company.services?.[0]?.name, price: company.services?.[0]?.price || 0 } });
  const chat = (company) => navigate(`${ROUTES.chat}/${company.slug || company._id}`);

  return (
    <div className="grid grid-cols-1 gap-6">
      <section className="card min-w-0 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_190px_200px]">
          <label className="input-icon col-span-2 md:col-span-1">
            <span className="material-symbols-outlined">search</span>
            <input className="input h-11 text-[15px] sm:h-12" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search businesses, products, services or areas" aria-label="Search businesses" />
            {query && <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-subtle hover:bg-sunken hover:text-ink" aria-label="Clear search"><span className="material-symbols-outlined text-[18px]">close</span></button>}
          </label>
          <select className="select h-11 sm:h-12" value={city} onChange={(event) => { setCity(event.target.value); setArea(''); }} aria-label="City">
            <option value="">All cities</option>
            {cities.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select className="select h-11 sm:h-12" value={area} onChange={(event) => setArea(event.target.value)} disabled={!city || !areas.length} aria-label="Area">
            <option value="">{city ? (areas.length ? 'All areas' : 'No areas listed') : 'Pick a city'}</option>
            {areas.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select className="select col-span-2 h-11 md:col-span-1 sm:h-12" value={fulfillment} onChange={(event) => setFulfillment(event.target.value)} aria-label="How you get it">
            <option value="">Any way to get it</option>
            {FULFILLMENT_TYPES.map((type) => <option key={type} value={type}>{FULFILLMENT[type].label}</option>)}
          </select>
        </div>
        <div className="rail-scroll hide-scrollbar edge-fade -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5 sm:mt-4">
          <button type="button" className="chip" aria-pressed={!industry && !category} onClick={() => { setIndustry(''); setCategory(''); }}><span className="material-symbols-outlined">apps</span>All businesses</button>
          {industries.filter((entry) => entry.companies > 0).map((entry) => (
            <button key={entry.value} type="button" className="chip" aria-pressed={industry === entry.value} onClick={() => { setIndustry(industry === entry.value ? '' : entry.value); setCategory(''); }} title={entry.description}>
              <span className="material-symbols-outlined">{entry.icon}</span>{entry.label}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13.5px] text-muted">
          {loading ? 'Finding businesses…' : <><span className="font-semibold text-ink">{total.toLocaleString()}</span> verified business{total === 1 ? '' : 'es'}{city ? ` in ${city}` : ''}</>}
          {refreshing && <Spinner className="h-3.5 w-3.5 text-subtle" />}
        </p>
        {filtersActive && <button type="button" onClick={reset} className="btn btn-ghost btn-sm"><span className="material-symbols-outlined">filter_alt_off</span>Clear filters</button>}
      </div>

      <Alert onRetry={refresh}>{error && !companies.length ? error.message : ''}</Alert>

      {loading ? <SkeletonCards count={8} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" /> : companies.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {/* The first two covers sit above the fold on phones, so they are
                fetched eagerly with high priority; the rest stay lazy. */}
            {companies.map((company, index) => <CompanyCard key={company._id || company.slug} company={company} eager={index < 2} onBook={book} onChat={chat} />)}
          </div>
          {data?.hasMore && (
            <div className="flex justify-center">
              <button type="button" className="btn btn-secondary" disabled={refreshing} onClick={() => setPages((value) => value + 1)}>
                {refreshing ? <><Spinner /> Loading</> : 'Show more businesses'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <EmptyState icon="search_off" title="No businesses match these filters" action={filtersActive && <button type="button" className="btn btn-primary" onClick={reset}>Clear filters</button>}>
            Try another city, business type or way to get it, or search with a broader term.
          </EmptyState>
        </div>
      )}
    </div>
  );
}

export default Companies;
