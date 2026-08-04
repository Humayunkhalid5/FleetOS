import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES, companyRoute } from '../../../constants';
import api from '../../../services/api';

// Fallback city chips for quick filtering (in case the API is unavailable)
const FALLBACK_CITIES = ['All', 'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar'];

function Companies() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('All');
  const [area, setArea] = useState('All');
  const [companies, setCompanies] = useState([]);
  const [cities, setCities] = useState(FALLBACK_CITIES);
  const [areasByCity, setAreasByCity] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/companies');
        setCompanies(response.companies || []);
        if (response.cities && response.cities.length) {
          setCities(['All', ...response.cities]);
        }
        if (response.areasByCity) {
          setAreasByCity(response.areasByCity);
        }
      } catch (err) {
        setError(err.message || 'Failed to load companies');
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  // Reset area whenever the city changes
  const selectCity = (c) => {
    setCity(c);
    setArea('All');
  };

  // Areas available for the currently selected city
  const availableAreas = city === 'All' ? [] : (areasByCity[city] || []);

  // Filter by search text, city, and area
  const filtered = companies.filter((company) => {
    const matchesCity = city === 'All' || (company.city || '').toLowerCase() === city.toLowerCase();
    const matchesArea =
      area === 'All' ||
      (company.areas || []).some((a) => a.toLowerCase().includes(area.toLowerCase())) ||
      (company.location || '').toLowerCase().includes(area.toLowerCase());
    const haystack = `${company.name || ''} ${company.location || ''} ${company.city || ''} ${company.service || ''} ${(company.areas || []).join(' ')}`.toLowerCase();
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
    return matchesCity && matchesArea && matchesQuery;
  });

  const goToDetails = (company) => {
    navigate(companyRoute(company.slug || company._id));
  };

  const goToBooking = (company) => {
    navigate(ROUTES.customizeBooking, {
      state: {
        companyId: company.slug || company._id,
        companyName: company.name,
        service: company.services?.[0]?.name || 'Fleet Full Inspection',
        price: company.services?.[0]?.price || 120,
      },
    });
  };

  return (
    <div className="bg-background text-on-surface min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm transition-colors duration-200 ease-in-out">
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Browse Companies</h1>
        </div>
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(ROUTES.dashboard)} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">home</span>
          </button>
        </div>
      </header>

      <main className="pt-24 px-container-margin max-w-7xl mx-auto space-y-lg">
        {/* Search */}
        <section className="space-y-sm">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-on-surface-variant">search</span>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-surface-container-lowest border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-body-md transition-all shadow-elevation-1"
              placeholder="Search companies by name, city or area in Pakistan"
              type="text"
            />
          </div>

          {/* City chips */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => selectCity(c)}
                className={`shrink-0 px-4 py-2 rounded-full font-nav-item text-nav-item transition-all ${
                  city === c ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Area chips (only shown when a specific city is selected) */}
          {city !== 'All' && availableAreas.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                {city} — choose your nearby area
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

        {/* Results count */}
        <p className="text-sm text-on-surface-variant">
          {loading
            ? 'Loading companies...'
            : `${filtered.length} company${filtered.length === 1 ? '' : 'ies'} found${city !== 'All' ? ` in ${city}` : ''}${area !== 'All' ? `, ${area}` : ''}`}
        </p>

        {/* Error */}
        {error && (
          <div className="bg-error-container text-on-error-container p-lg rounded-xl text-center font-body-md">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-surface-container-lowest rounded-xl p-lg shadow-elevation-1 border border-surface-container-low animate-pulse">
                <div className="w-full h-32 bg-surface-container-high rounded-lg mb-md"></div>
                <div className="h-4 bg-surface-container-high rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-surface-container-high rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="bg-surface-container-lowest p-xl rounded-xl shadow-elevation-1 border border-surface-container-low text-center">
            <span className="material-symbols-outlined text-4xl text-outline mb-sm">storefront</span>
            <p className="font-body-lg text-body-lg text-on-surface">No companies found</p>
            <p className="font-body-md text-body-md text-on-surface-variant">Try a different city, area or search.</p>
          </div>
        )}

        {/* Company grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {filtered.map((company) => (
              <div key={company._id || company.slug} className="bg-surface-container-lowest rounded-xl shadow-elevation-1 overflow-hidden border border-surface-container-low flex flex-col">
                {/* Hero image */}
                <div className="h-40 w-full bg-surface-container-high overflow-hidden">
                  {company.heroImage ? (
                    <img className="w-full h-full object-cover" alt={company.name} src={company.heroImage} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-container text-on-primary-container">
                      <span className="material-symbols-outlined text-5xl">local_shipping</span>
                    </div>
                  )}
                </div>

                <div className="p-md flex flex-col flex-1">
                  <div className="flex justify-between items-start gap-md">
                    <div className="min-w-0">
                      <h3 className="font-headline-md text-headline-md text-on-surface truncate">{company.name}</h3>
                      <p className="text-sm text-on-surface-variant flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {company.location || company.city || 'Pakistan'}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-bold shrink-0">★ {company.rating || 4.5}</span>
                  </div>

                  <p className="mt-sm text-sm text-on-surface-variant line-clamp-2 flex-1">{company.description}</p>

                  {/* Areas served */}
                  {company.areas && company.areas.length > 0 && (
                    <div className="mt-md flex flex-wrap gap-sm">
                      {company.areas.slice(0, 3).map((a) => (
                        <span key={a} className="px-2 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs">
                          {a}
                        </span>
                      ))}
                      {company.areas.length > 3 && (
                        <span className="px-2 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs">
                          +{company.areas.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Services preview */}
                  {company.services && company.services.length > 0 && (
                    <div className="mt-md flex flex-wrap gap-sm">
                      {company.services.slice(0, 2).map((s) => (
                        <span key={s.name} className="px-2 py-1 rounded-full bg-primary-container text-on-primary-container text-xs">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-md flex gap-sm">
                    <button
                      onClick={() => goToBooking(company)}
                      className="flex-1 py-2 rounded-lg bg-primary text-on-primary font-medium text-sm"
                    >
                      Book Now
                    </button>
                    <button
                      onClick={() => goToDetails(company)}
                      className="flex-1 py-2 rounded-lg bg-surface-container-low text-on-surface-variant font-medium text-sm hover:bg-surface-container-high transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Companies;
