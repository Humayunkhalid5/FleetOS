import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, MATERIALS, BASE_LABOR } from '../../../constants';

function CustomizeBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const companyId = location.state?.companyId || 'swiftfleet';
  const companyName = location.state?.companyName || 'Selected company';
  const [problemDetails, setProblemDetails] = useState(location.state?.problemDetails || '');

  // Capture the chosen service and service location
  const [service, setService] = useState(location.state?.service || 'Fleet Full Inspection');
  const [servicePrice, setServicePrice] = useState(Number(location.state?.price) || BASE_LABOR);
  const [serviceLocation, setServiceLocation] = useState({
    address: '',
    lat: null,
    lng: null,
  });
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [locationMode, setLocationMode] = useState('manual'); // 'manual' | 'gps'
  const [gpsLabel, setGpsLabel] = useState('');

  const [materials, setMaterials] = useState(() => {
    const init = {};
    MATERIALS.forEach((m) => { init[m.id] = { qty: 0, price: m.price, name: m.name }; });
    return init;
  });

  const baseLabor = BASE_LABOR;

const saveDraft = () => {
    const draft = {
      materials,
      service,
      servicePrice,
      serviceLocation,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('fleetos-booking-draft', JSON.stringify(draft));
    alert('Draft saved! You can continue anytime.');
  };

  const updateQty = (id, delta) => {
    setMaterials(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        qty: Math.max(0, prev[id].qty + delta)
      }
    }));
  };

  const materialsTotal = Object.values(materials).reduce((sum, item) => sum + (item.qty * item.price), 0);
  const grandTotal = baseLabor + materialsTotal;

  // Capture the user's real GPS location
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
        // Attempt reverse-geocode via OpenStreetMap Nominatim (no API key required)
        let label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          if (data?.display_name) label = data.display_name;
        } catch {
          // fall back to coordinates if reverse geocode fails
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
      {/* TopAppBar */}
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
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
            <img className="w-full h-full object-cover" alt="Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHJ-tIFrH0h8kobUtglmS0Aa0JWF67kSGq14RRcl9CHjEhrHHBHzGM_ry8my-ABPzmixZA-ByCoDwWYCDG7-AhzYTX23Q48a4lx_RlnlC3hQ7K5PmXCsxMdcyCNe4MHSkgckPLl2m_Zgv0XbvBtZLrpxZQx_h6p6lmPPglsrCRqrTk95u_Ii4bCT7k0VGjeuOtb1Fnrt71AmmCzsvMNdNRfRVwe8NsTMpZXxB7-oNJcWygFDWbSe5mIw" />
          </div>
        </div>
      </header>

      <main className="pt-24 pb-40 px-container-margin max-w-7xl mx-auto">
        <div className="mb-xl">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Customize Your Booking</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Choose the service and any required materials. The company will assign a technician after you submit.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          {/* LEFT COLUMN: Technicians */}
          <div className="lg:col-span-8 space-y-lg">
            {/* Service Selection Card */}
            <section className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_16px_0_rgba(11,29,45,0.08)] border border-outline-variant">
              <div className="flex items-center justify-between mb-md">
                <h3 className="font-headline-md text-headline-md">Service</h3>
                <span className="material-symbols-outlined text-on-surface-variant">build</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                {['Fleet Full Inspection', 'Express Oil & Filter Change', 'Diagnostic Scan & Repair'].map((s) => {
                  const prices = { 'Fleet Full Inspection': 120, 'Express Oil & Filter Change': 120, 'Diagnostic Scan & Repair': 150 };
                  const active = service === s;
                  return (
                    <button
                      key={s}
                      onClick={() => { setService(s); setServicePrice(prices[s]); }}
                      className={`p-md rounded-xl border-2 text-left transition-all ${active ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary/50'}`}
                    >
                      <span className="font-nav-item text-nav-item text-on-surface block">{s}</span>
                      <span className="font-label-sm text-label-sm text-primary mt-xs block">${prices[s].toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Location */}
              <div className="mt-md pt-md border-t border-surface-container">
                <div className="flex items-center justify-between mb-sm">
                  <h4 className="font-headline-md text-headline-md">Service Location</h4>
                </div>

                {/* Two-option selector */}
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

                {/* GPS result pill */}
                {locationMode === 'gps' && gpsLabel && (
                  <div className="mb-sm flex items-start gap-sm p-sm rounded-xl bg-primary-container text-on-primary-container text-sm">
                    <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">location_on</span>
                    <span className="flex-1 leading-snug">{gpsLabel}</span>
                    <button onClick={clearGpsLocation} className="shrink-0 hover:opacity-70 transition-opacity" title="Clear GPS location">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )}

                {/* Manual address input — always visible so user can refine */}
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

          {/* RIGHT COLUMN: Materials */}
          <div className="lg:col-span-4">
            <div className="bg-surface-container-lowest rounded-2xl p-lg shadow-[0_4px_16px_0_rgba(11,29,45,0.08)] border border-outline-variant sticky top-24">
              <div className="flex items-center justify-between mb-md">
                <h3 className="font-headline-md text-headline-md">Required Parts & Items</h3>
                <span className="material-symbols-outlined text-on-surface-variant">inventory_2</span>
              </div>
              <div className="p-sm bg-error-container text-on-error-container rounded-lg mb-md flex gap-sm">
                <span className="material-symbols-outlined text-md">info</span>
                <p className="font-label-sm text-label-sm leading-tight">Choose any items the technician may need so the company can prepare the job.</p>
              </div>
              
              <div className="space-y-md max-h-[400px] overflow-y-auto pr-2">
                {Object.keys(materials).map((key) => (
                  <div key={key} className="flex items-center justify-between py-sm border-b border-surface-container">
                    <div>
                      <h5 className="font-nav-item text-nav-item">{materials[key].name}</h5>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">${materials[key].price.toFixed(2)} / unit</p>
                    </div>
                    <div className="flex items-center bg-surface-container rounded-lg px-2">
                      <button className="p-1 hover:text-primary transition-colors" onClick={() => updateQty(key, -1)}><span className="material-symbols-outlined">remove</span></button>
                      <span className="w-8 text-center font-bold">{materials[key].qty}</span>
                      <button className="p-1 hover:text-primary transition-colors" onClick={() => updateQty(key, 1)}><span className="material-symbols-outlined">add</span></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-lg pt-md border-t border-surface-container">
                <div className="flex justify-between items-center mb-xs">
                  <span className="font-body-md text-body-md">Materials Subtotal</span>
                  <span className="font-nav-item text-nav-item font-bold">${materialsTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Sticky Summary Bar */}
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
              <span className="font-headline-md text-headline-md font-bold text-on-surface">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center gap-md w-full md:w-auto">
            <button onClick={saveDraft} className="flex-1 md:flex-none px-xl py-md rounded-xl border border-outline font-nav-item text-nav-item hover:bg-surface-container transition-colors">Save Draft</button>
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
              className="flex-1 md:flex-none px-xl py-md rounded-xl font-nav-item text-nav-item hover:shadow-lg transition-all scale-100 active:scale-95 bg-primary text-on-primary"
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
