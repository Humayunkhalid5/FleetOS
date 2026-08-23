import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, BASE_LABOR } from '../../../constants';
import api from '../../../services/api';

const currency = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0,
});

function CustomizeBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const companyId = location.state?.companyId || 'swiftfleet';
  const companyName = location.state?.companyName || 'Selected company';
  const [problemDetails, setProblemDetails] = useState(location.state?.problemDetails || '');

  const [availableServices, setAvailableServices] = useState([]);
  const [service, setService] = useState(location.state?.service || 'Fleet Maintenance');
  const [servicePrice, setServicePrice] = useState(Number(location.state?.price) || BASE_LABOR);
  const [serviceLocation, setServiceLocation] = useState({
    address: '',
    lat: null,
    lng: null,
  });
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [locationMode, setLocationMode] = useState('manual');
  const [gpsLabel, setGpsLabel] = useState('');
  const [materials, setMaterials] = useState({});
  const [companyItems, setCompanyItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');

  useEffect(() => {
    async function loadCompanyServices() {
      if (!companyId) return;
      try {
        const res = await api.get(`/services?companyId=${encodeURIComponent(companyId)}`);
        if (res && Array.isArray(res.services) && res.services.length > 0) {
          setAvailableServices(res.services);
          if (!location.state?.service) {
            setService(res.services[0].name);
            setServicePrice(Number(res.services[0].price) || BASE_LABOR);
          }
        }
      } catch (err) {
        setAvailableServices([]);
      }
    }
    loadCompanyServices();
  }, [companyId, location.state?.service]);

  useEffect(() => {
    async function loadCompanyInventory() {
      if (!companyId) return;
      setItemsLoading(true);
      setItemsError('');
      try {
        const res = await api.get(`/public/inventory?companyId=${encodeURIComponent(companyId)}`, { noCache: true });
        const items = Array.isArray(res?.inventory) ? res.inventory : [];
        setCompanyItems(items);
        setMaterials(items.reduce((acc, item) => {
          const id = item._id || item.id || item.sku || item.name;
          acc[id] = {
            id,
            sku: item.sku || '',
            qty: 0,
            price: Number(item.unitPrice ?? item.price ?? 0),
            name: item.name,
            unit: item.unit || 'unit',
            category: item.category || 'Company item',
            stock: Number(item.quantity ?? item.qty ?? 0),
          };
          return acc;
        }, {}));
      } catch (err) {
        setCompanyItems([]);
        setMaterials({});
        setItemsError(err.message || 'Company items could not be loaded.');
      } finally {
        setItemsLoading(false);
      }
    }
    loadCompanyInventory();
  }, [companyId]);

  const baseLabor = Number(servicePrice) || BASE_LABOR;

  const saveDraft = async () => {
    const draft = {
      materials,
      service,
      servicePrice,
      serviceLocation,
      savedAt: new Date().toISOString(),
    };
    try {
      await api.put('/auth/booking-draft', draft);
      alert('Draft saved to your FleetOS account.');
    } catch (error) {
      alert(error.message || 'Draft could not be saved.');
    }
  };

  const updateQty = (id, delta) => {
    setMaterials((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const nextQty = Math.max(0, item.qty + delta);
      const cappedQty = item.stock > 0 ? Math.min(nextQty, item.stock) : nextQty;
      return {
        ...prev,
        [id]: {
          ...item,
          qty: cappedQty,
        },
      };
    });
  };

  const materialsTotal = Object.values(materials).reduce((sum, item) => sum + (item.qty * item.price), 0);
  const grandTotal = baseLabor + materialsTotal;

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by this browser. Please type your address below.');
      return;
    }
    setLocatingAddress(true);
    setLocationMode('gps');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          if (data?.display_name) label = data.display_name;
        } catch {
          // Coordinates are still useful when reverse geocoding is unavailable.
        }
        setGpsLabel(label);
        setServiceLocation({ address: label, lat: latitude, lng: longitude });
        setLocatingAddress(false);
      },
      (err) => {
        const messages = {
          1: 'Location permission denied. Please allow access or type your address below.',
          2: 'Location unavailable. Please type your address manually.',
          3: 'Location request timed out. Please type your address manually.',
        };
        alert(messages[err.code] || 'Could not access your location. Please enter an address manually.');
        setLocationMode('manual');
        setLocatingAddress(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clearGpsLocation = () => {
    setLocationMode('manual');
    setGpsLabel('');
    setServiceLocation({ address: '', lat: null, lng: null });
  };

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm transition-colors duration-200 ease-in-out">
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(-1)} className="p-sm rounded-full hover:bg-surface-container-low transition-colors duration-200">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">FleetOS</h1>
        </div>
        <div className="flex items-center gap-sm">
          <button onClick={() => navigate(ROUTES.bookings)} className="p-sm rounded-full hover:bg-surface-container-low transition-colors duration-200">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-primary text-white flex items-center justify-center font-bold text-xs">
            U
          </div>
        </div>
      </header>

      <main className="pt-24 pb-40 px-container-margin max-w-7xl mx-auto">
        <div className="mb-xl">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Customize Your Booking</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Choose the service and company-added items for <span className="font-bold text-primary">{companyName}</span>.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          <div className="lg:col-span-8 space-y-lg">
            <section className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_16px_0_rgba(11,29,45,0.08)] border border-outline-variant">
              <div className="flex items-center justify-between mb-md">
                <h3 className="font-headline-md text-headline-md">Service</h3>
                <span className="material-symbols-outlined text-on-surface-variant">build</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                {(availableServices.length > 0 ? availableServices : [{ name: service, price: servicePrice }]).map((svcObj) => {
                  const sName = svcObj.name;
                  const sPrice = Number(svcObj.price) || BASE_LABOR;
                  const active = service === sName;
                  return (
                    <button
                      key={sName}
                      onClick={() => { setService(sName); setServicePrice(sPrice); }}
                      className={`p-md rounded-xl border-2 text-left transition-all ${active ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary/50'}`}
                    >
                      <span className="font-nav-item text-nav-item text-on-surface block font-bold">{sName}</span>
                      <span className="font-label-sm text-label-sm text-primary mt-xs block">{currency.format(sPrice)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-md pt-md border-t border-surface-container">
                <div className="flex items-center justify-between mb-sm">
                  <h4 className="font-headline-md text-headline-md">Service Location</h4>
                </div>

                <div className="grid grid-cols-2 gap-sm mb-md">
                  <button
                    type="button"
                    onClick={() => setLocationMode('manual')}
                    className={`flex items-center gap-sm p-md rounded-xl border-2 transition-all text-left ${
                      locationMode === 'manual'
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant hover:border-primary/50'
                    }`}
                  >
                    <span className={`material-symbols-outlined ${locationMode === 'manual' ? 'text-primary' : 'text-on-surface-variant'}`}>edit_location</span>
                    <div>
                      <p className="font-nav-item text-nav-item text-on-surface text-sm">Type address</p>
                      <p className="text-xs text-on-surface-variant">Enter preferred location</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={locatingAddress}
                    className={`flex items-center gap-sm p-md rounded-xl border-2 transition-all text-left disabled:opacity-70 ${
                      locationMode === 'gps'
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant hover:border-primary/50'
                    }`}
                  >
                    <span className={`material-symbols-outlined ${locatingAddress ? 'animate-spin' : ''} ${locationMode === 'gps' ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {locatingAddress ? 'progress_activity' : 'my_location'}
                    </span>
                    <div>
                      <p className="font-nav-item text-nav-item text-on-surface text-sm">
                        {locatingAddress ? 'Detecting…' : 'Use GPS'}
                      </p>
                      <p className="text-xs text-on-surface-variant">Detect current location</p>
                    </div>
                  </button>
                </div>

                {locationMode === 'gps' && gpsLabel && (
                  <div className="mb-sm flex items-start gap-sm p-sm rounded-xl bg-primary-container text-on-primary-container text-sm">
                    <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">location_on</span>
                    <span className="flex-1 leading-snug">{gpsLabel}</span>
                    <button onClick={clearGpsLocation} className="shrink-0 hover:opacity-70 transition-opacity" title="Clear GPS location">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )}

                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">location_on</span>
                  <input
                    value={locationMode === 'gps' && gpsLabel ? gpsLabel : serviceLocation.address}
                    onChange={(e) => {
                      setLocationMode('manual');
                      setGpsLabel('');
                      setServiceLocation((prev) => ({ ...prev, address: e.target.value }));
                    }}
                    className="w-full pl-xl pr-md py-md bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-on-surface"
                    placeholder="Enter or confirm your service address (city, area, street)"
                  />
                </div>
                <p className="mt-xs text-xs text-on-surface-variant">
                  You can type a preferred address even after using GPS — just edit the field above.
                </p>
              </div>
            </section>

            <section className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_16px_0_rgba(11,29,45,0.08)] border border-outline-variant">
              <div className="flex items-center justify-between mb-md">
                <h3 className="font-headline-md text-headline-md">Request Details</h3>
                <span className="material-symbols-outlined text-on-surface-variant">description</span>
              </div>
              <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="problem-details">What issue needs attention?</label>
              <textarea
                id="problem-details"
                value={problemDetails}
                onChange={(e) => setProblemDetails(e.target.value)}
                rows="4"
                className="w-full mt-sm p-md rounded-xl border border-outline-variant bg-surface-container-low focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="Share the problem, symptoms, urgency, and any notes for the company"
              />
              <p className="mt-sm text-sm text-on-surface-variant">The selected company will review the request and assign a technician once the service is confirmed.</p>
            </section>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-surface-container-lowest rounded-2xl p-lg shadow-[0_4px_16px_0_rgba(11,29,45,0.08)] border border-outline-variant sticky top-24">
              <div className="flex items-center justify-between mb-md">
                <div>
                  <h3 className="font-headline-md text-headline-md">Company Added Items</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Only inventory added by {companyName} appears here.</p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">inventory_2</span>
              </div>
              <div className="p-sm bg-primary-container text-on-primary-container rounded-lg mb-md flex gap-sm">
                <span className="material-symbols-outlined text-md">info</span>
                <p className="font-label-sm text-label-sm leading-tight">Select optional items if you want the company to bring them for this service.</p>
              </div>

              <div className="space-y-md max-h-[400px] overflow-y-auto pr-2">
                {itemsLoading && (
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md animate-pulse">
                    <div className="h-4 w-2/3 rounded bg-outline-variant/30 mb-3" />
                    <div className="h-3 w-1/2 rounded bg-outline-variant/20" />
                  </div>
                )}

                {!itemsLoading && itemsError && (
                  <div className="rounded-xl border border-error/20 bg-error-container/40 p-md text-on-error-container">
                    <div className="flex items-center gap-sm font-bold">
                      <span className="material-symbols-outlined">warning</span>
                      Items unavailable
                    </div>
                    <p className="mt-xs text-sm">{itemsError}</p>
                  </div>
                )}

                {!itemsLoading && !itemsError && companyItems.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-lg text-center">
                    <div className="mx-auto mb-sm flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <span className="material-symbols-outlined">inventory_2</span>
                    </div>
                    <h4 className="font-nav-item text-nav-item font-bold text-on-surface">No extra items added yet</h4>
                    <p className="mt-xs text-sm text-on-surface-variant">{companyName} has not published inventory items for client bookings. You can still submit the service request.</p>
                  </div>
                )}

                {!itemsLoading && !itemsError && Object.keys(materials).map((key) => {
                  const item = materials[key];
                  return (
                    <div key={key} className="flex items-center justify-between gap-md py-sm border-b border-surface-container">
                      <div className="min-w-0">
                        <h5 className="font-nav-item text-nav-item truncate">{item.name}</h5>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          {currency.format(item.price)} / {item.unit}
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-1">
                          {item.category}{item.sku ? ` · ${item.sku}` : ''} · {item.stock} in stock
                        </p>
                      </div>
                      <div className="flex items-center bg-surface-container rounded-lg px-2 shrink-0">
                        <button type="button" className="p-1 hover:text-primary transition-colors disabled:opacity-40" disabled={item.qty === 0} onClick={() => updateQty(key, -1)}>
                          <span className="material-symbols-outlined">remove</span>
                        </button>
                        <span className="w-8 text-center font-bold">{item.qty}</span>
                        <button type="button" className="p-1 hover:text-primary transition-colors disabled:opacity-40" disabled={item.stock > 0 && item.qty >= item.stock} onClick={() => updateQty(key, 1)}>
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-lg pt-md border-t border-surface-container">
                <div className="flex justify-between items-center mb-xs">
                  <span className="font-body-md text-body-md">Items Subtotal</span>
                  <span className="font-nav-item text-nav-item font-bold">{currency.format(materialsTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 w-full z-50 bg-white/80 backdrop-blur-md border-t border-outline-variant py-md px-container-margin shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-md">
          <div className="flex items-center gap-lg">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Company</span>
              <span className="font-nav-item text-nav-item font-bold text-primary">{companyName}</span>
            </div>
            <div className="h-8 w-px bg-outline-variant hidden md:block"></div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Estimated Total</span>
              <span className="font-headline-md text-headline-md font-bold text-on-surface">{currency.format(grandTotal)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => navigate(`${ROUTES.chat}/${companyId}`)}
              className="flex-1 md:flex-none px-4 py-3 bg-emerald-600 text-white rounded-xl font-nav-item text-xs font-bold shadow hover:bg-emerald-700 transition-all flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
              Live Chat
            </button>
            <a
              href="tel:+923000000000"
              className="flex-1 md:flex-none px-4 py-3 bg-secondary text-white rounded-xl font-nav-item text-xs font-bold shadow hover:bg-secondary-container transition-all flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">call</span>
              Call
            </a>
            <button onClick={saveDraft} className="flex-1 md:flex-none px-4 py-3 rounded-xl border border-outline font-nav-item text-xs hover:bg-surface-container transition-colors">Save Draft</button>
            <button
              onClick={() => {
                navigate(ROUTES.bookingSummary, {
                  state: {
                    materials,
                    materialsTotal,
                    grandTotal,
                    companyId,
                    companyName,
                    service,
                    servicePrice,
                    serviceLocation,
                    problemDetails,
                  }
                });
              }}
              className="flex-1 md:flex-none px-6 py-3 rounded-xl font-nav-item text-xs font-bold hover:shadow-lg transition-all bg-primary text-on-primary"
            >
              Submit Request
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default CustomizeBooking;
