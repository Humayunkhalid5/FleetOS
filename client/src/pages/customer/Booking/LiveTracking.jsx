import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';
import 'leaflet/dist/leaflet.css';

// Default Bay Area coordinates as fallback
const DEFAULT_ORIGIN = { lat: 37.7749, lng: -122.4194, label: 'FleetOS Dispatch Center' };
const DEFAULT_DESTINATION = { lat: 37.7894, lng: -122.3946, label: '882 Modern Way, Tech Park, San Francisco, CA 94103' };

// Fix Leaflet default icon paths (bundler issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom divIcon for the technician (animated truck)
const createTechIcon = () =>
  L.divIcon({
    className: 'tech-marker',
    html: `
      <div class="relative">
        <div class="absolute -inset-2 rounded-full bg-primary/30 animate-ping"></div>
        <div class="absolute -inset-5 rounded-full bg-primary/15"></div>
        <div class="w-12 h-12 rounded-full bg-white shadow-xl border-2 border-primary flex items-center justify-center relative">
          <span class="material-symbols-outlined text-primary" style="font-size:26px;font-variationSettings:'FILL' 1">local_shipping</span>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

// Custom divIcon for the user's real location (pulsing accent dot)
const createUserIcon = () =>
  L.divIcon({
    className: 'user-marker',
    html: `
      <div class="relative">
        <div class="absolute -inset-2 rounded-full bg-tertiary/30 animate-ping"></div>
        <div class="w-9 h-9 rounded-full bg-white shadow-lg border-2 border-tertiary flex items-center justify-center relative">
          <span class="material-symbols-outlined text-tertiary" style="font-size:20px;font-variationSettings:'FILL' 1">my_location</span>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const STAGE_ORDER = ['assigned', 'on-the-way', 'arrived', 'working', 'completed'];
const STAGE_LABELS = { assigned: 'Assigned', 'on-the-way': 'On the Way', arrived: 'Arrived', working: 'Working', completed: 'Completed' };
const STAGE_ICONS = { assigned: 'assignment', 'on-the-way': 'near_me', arrived: 'location_on', working: 'construction', completed: 'task_alt' };

// Haversine distance in km
const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = ((b?.lat || 0) - (a?.lat || 0)) * Math.PI / 180;
  const dLng = ((b?.lng || 0) - (a?.lng || 0)) * Math.PI / 180;
  const la1 = (a?.lat || 0) * Math.PI / 180;
  const la2 = (b?.lat || 0) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

function LiveTracking() {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingId = location.state?.bookingId || null;
  const [selectedTech, setSelectedTech] = useState(location.state?.selectedTech || 'Marcus Chen');

  // Map state
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Tracking state
  const [tracking, setTracking] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [locating, setLocating] = useState(true);
  const [geoError, setGeoError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eta, setEta] = useState(12);
  const [stage, setStage] = useState('assigned');
  const [sheetOpen, setSheetOpen] = useState(false); // mobile bottom-sheet expanded state

  // Leaflet layer refs
  const techMarkerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const socketRef = useRef(null);
  const mapFitDoneRef = useRef(false);

  const bookingIdRef = useRef(bookingId);
  useEffect(() => { bookingIdRef.current = bookingId; }, [bookingId]);

  const stageIndex = Math.max(0, STAGE_ORDER.indexOf(stage));

  // Compute route progress as a percentage (0–100)
  const progressPct = (() => {
    if (!tracking?.origin || !tracking?.destination) return 0;
    const total = haversineKm(tracking.origin, tracking.destination);
    const traveled = haversineKm(tracking.origin, tracking.currentPosition || tracking.origin);
    return total > 0 ? Math.max(0, Math.min(100, Math.round((traveled / total) * 100))) : 0;
  })();

  // Located description for UI
  const serviceLocationLabel = tracking?.destination?.label || tracking?.location || 'Service Location';

  // ------------- 1. Fetch booking tracking data -------------
  const fetchTracking = useCallback(async (id) => {
    if (!id) {
      setLoading(false);
      setError('');
      return;
    }
    try {
      const response = await api.get(`/bookings/${id}/tracking`);
      const data = response.booking || response;
      setTracking(data);
      setSelectedTech(data.technician || selectedTech);
      setEta(data.tracking?.etaMinutes ?? 12);
      setStage(data.tracking?.stage || 'assigned');
      if (data.currentPosition) {
        setUserPos((prev) => prev || { lat: data.currentPosition.lat, lng: data.currentPosition.lng });
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load tracking data. Running in demo mode.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTracking(bookingId);
  }, [bookingId, fetchTracking]);

  // ------------- 2. Get user's REAL location -------------
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation not supported by this browser.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError('');
        setLocating(false);
      },
      (err) => {
        setGeoError('Unable to access your location. Showing approximate location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
    );
  }, []);

  // ------------- 3. Initialize Leaflet map -------------
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    // Use userPos dynamically if available to ensure map reflects real client location
    const baseLat = userPos?.lat || 31.5204;
    const baseLng = userPos?.lng || 74.3587;

    const dynamicOrigin = { lat: baseLat - 0.015, lng: baseLng - 0.012, label: 'FleetOS Service Center' };
    const dynamicDestination = { lat: baseLat, lng: baseLng, label: 'Your Current Location' };

    const origin = tracking?.origin || dynamicOrigin;
    const destination = tracking?.destination || dynamicDestination;
    const currentPosition = tracking?.currentPosition || origin;

    const hasRoute = true;
    const center = userPos || currentPosition;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([center.lat, center.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const routeLatLngs = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ];

    // Route polyline between origin and destination
    if (hasRoute) {
      routePolylineRef.current = L.polyline(routeLatLngs, {
        color: '#3F51B5',
        weight: 4,
        opacity: 0.55,
        dashArray: '8 8',
      }).addTo(map);
    }

    // Origin marker
    L.marker([origin.lat, origin.lng], {
      icon: L.divIcon({
        className: 'origin-marker',
        html: `<div class="relative"><div class="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-lg"></div><div class="absolute -inset-1.5 rounded-full bg-primary/20"></div></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    }).addTo(map).bindTooltip(origin.label || 'Dispatch Center', { direction: 'top', offset: [0, -8] });

    // Destination marker
    L.marker([destination.lat, destination.lng], {
      icon: L.divIcon({
        className: 'dest-marker',
        html: `<div class="relative"><div class="w-10 h-10 rounded-full bg-white shadow-lg border-2 border-tertiary flex items-center justify-center"><span class="material-symbols-outlined text-tertiary" style="font-size:20px;font-variationSettings:'FILL' 1">home_work</span></div><div class="absolute -inset-3 rounded-full bg-tertiary/15"></div></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    }).addTo(map).bindTooltip(destination.label || 'Service Location', { direction: 'top', offset: [0, -8] });

    // Technician marker (animated truck)
    techMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], { icon: createTechIcon() }).addTo(map);

    // Fit bounds to the route (or to the single demo point) — keep the map focused
    if (hasRoute) {
      map.fitBounds(L.latLngBounds(routeLatLngs), { padding: [60, 60], maxZoom: 15 });
    } else {
      map.setView([center.lat, center.lng], 13);
    }

    mapRef.current = map;
    setMapReady(true);

    // Fix Leaflet's zero-size bug: invalidate after mount + on window resize.
    const t = setTimeout(() => map.invalidateSize(), 200);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
      techMarkerRef.current = null;
      userMarkerRef.current = null;
      routePolylineRef.current = null;
      setMapReady(false);
      mapFitDoneRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking]);

  // ------------- 4. Place user's real location marker -------------
  useEffect(() => {
    if (!userPos || !mapRef.current) return;
    const map = mapRef.current;
    const latlng = [userPos.lat, userPos.lng];

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(latlng, { icon: createUserIcon() }).addTo(map);
      userMarkerRef.current.bindTooltip('Your Location', { permanent: false });
    } else {
      userMarkerRef.current.setLatLng(latlng);
    }
  }, [userPos]);

  // ------------- 5. Socket.io live tracking -------------
  useEffect(() => {
    const token = localStorage.getItem('fleetos-token');
    const id = bookingIdRef.current;
    if (!id || !token) return;

    let socket;
    try {
      socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
    } catch (err) {
      return;
    }
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join-booking', id));

    socket.on('tracking:snapshot', (data) => {
      if (!data) return;
      setTracking(data);
      setSelectedTech((prev) => data.technician || prev);
      setEta(data.tracking?.etaMinutes ?? eta);
      setStage(data.tracking?.stage || 'assigned');
      if (data.currentPosition) moveTechMarker(data.currentPosition);
    });

    socket.on('tracking:update', (data) => {
      if (!data) return;
      setTracking(data);
      setEta(data.tracking?.etaMinutes ?? eta);
      setStage(data.tracking?.stage || 'assigned');
      if (data.currentPosition) moveTechMarker(data.currentPosition);
      if (data.status === 'completed') { /* handled via review flow */ }
    });

    socket.on('tracking:error', (err) => {
      setError(err?.message || 'Tracking connection error');
    });

    return () => {
      socket.emit('leave-booking', id);
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Move the technician marker smoothly
  const moveTechMarker = useCallback((pos) => {
    if (!mapRef.current || !techMarkerRef.current) return;
    techMarkerRef.current.setLatLng([Number(pos.lat), Number(pos.lng)]);
  }, []);

  // Local fallback simulation when backend offline / demo mode
  useEffect(() => {
    if (loading) return;
    if (bookingId && tracking) return;

    let interval;
    let simPos = tracking?.currentPosition || DEFAULT_ORIGIN;
    let progress = 0;
    const dest = tracking?.destination || DEFAULT_DESTINATION;

    const step = () => {
      progress = Math.min(1, progress + 0.02 + Math.random() * 0.02);
      const lat = simPos.lat + (dest.lat - simPos.lat) * progress;
      const lng = simPos.lng + (dest.lng - simPos.lng) * progress;
      simPos = { lat, lng };
      moveTechMarker(simPos);
      setEta(Math.max(1, Math.round((1 - progress) * 12)));
      setStage(progress > 0.85 ? 'arrived' : 'on-the-way');
    };

    interval = setInterval(step, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, bookingId, tracking, moveTechMarker]);

  const shareBooking = () => {
    const shareData = { title: 'FleetOS Live Tracking', text: `Track your service with ${selectedTech}`, url: window.location.href };
    if (navigator.share) navigator.share(shareData).catch(() => {});
    else navigator.clipboard?.writeText(window.location.href);
  };

  const [cancelling, setCancelling] = useState(false);

  const cancelBooking = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      if (bookingId) await api.patch(`/bookings/${bookingId}`, { status: 'cancelled' });
      setError('');
      setTimeout(() => navigate(ROUTES.bookings), 600);
    } catch (err) {
      setError('Booking cancelled locally. (Backend offline)');
      setTimeout(() => navigate(ROUTES.bookings), 600);
    } finally {
      setCancelling(false);
    }
  };

  const contactSupport = () => {
    alert('Support: call +1 (555) 000-1234 or email support@fleetos.com');
  };

  // Map controls
  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();
  const locateMe = () => {
    if (!mapRef.current) return;
    if (userPos) mapRef.current.flyTo([userPos.lat, userPos.lng], 14, { duration: 1 });
    else setGeoError('Your location is not available yet.');
  };

  const getTechAvatar = (name) => {
    if (name === 'Elena Rodriguez') return "https://lh3.googleusercontent.com/aida-public/AB6AXuDnCiWvnkOKQReJfbwVPnaN6tu7s5397gTYSVBPMyiX6toCf8p5wo3eRuZ2QIc2TqcZrm-1vI7JyRT7oqpSWXpAdRECBDCnRGuLQM6zGzCDYi5wegUEzJG2p7E7E7jfdx9hSCUUoveU458OaY-di3G4frMSjmTJwjSznLPYXVl_zY_nMTuD0q3drMrje1gMak8VTFXTBe687naWHZTIHqBAHuyZqtzAN7B6ZysOa9vPYFnRqmNuHtlY1A";
    if (name === 'Jordan Smith') return "https://lh3.googleusercontent.com/aida-public/AB6AXuBdSq9kds-9hvrnwo749V1I2EinNun7_8MX5BIE5-IMKUNAe4eYNSZlRYfJsQoPN6Bhr_Si7Oj9uq3XH8CcF0q8t2BSjIFBI_5A248PGaEjKqs1N1rbNOcqGh-pFfZ5qZmC7dv0k7AJ0lOUJGzjeGN4P8Z_QnnObTriizg6iqp9D11hzs6aSOcdIpfpF8Q04gH3UJwNaz_BNK0OIH9K1hLW_V9CsATPDG8NQAVE-f5Eg0eDZhdoGe4WAg";
    return "https://lh3.googleusercontent.com/aida-public/AB6AXuCYZfr7LM0amt7amV3qWRzvkJ0chN1P5Vl4ak4XWMFLv9cR1dVSKVEJboF-5wik_OaBGzQbe_f9zpEDGNelEXwpkwhRfCDzu2VSrcVbR395XicT3b4RJGvpMzH7XsiTXzbp8fwwVFQA-OcMy3Ox3onCOIgmS8yJsUido-6p-h_pNhdIOAC7ZJCIlrbfYLmHnHtdBJI5wRv0L98ng9SZ93ikcBUnCdIyedi614HkAnkqrcIDLX7mQr8uRg";
  };

  const primaryStage = STAGE_LABELS[stage] || 'Assigned';
  const progressPercent = stage === 'completed' ? 100 : progressPct;

  return (
    <div className="live-tracking-root fixed inset-0 bg-background text-on-surface font-body-md">
      {/* Top App Bar */}
      <header className="absolute top-0 left-0 right-0 z-[1000] flex justify-between items-center px-lg h-16 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-primary" aria-label="Back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary leading-tight">Live Tracking</h1>
            <div className="flex items-center gap-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{primaryStage}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <button onClick={shareBooking} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-primary" aria-label="Share">
            <span className="material-symbols-outlined">share</span>
          </button>
        </div>
      </header>

      {/* Real Map */}
      <main className="relative w-full h-full">
        {/* Map container — full viewport behind overlays */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0 w-full h-full bg-surface-dim" style={{ width: '100%', height: '100%' }} />

        {/* Floating Live Status pill */}
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-[1001] transition-opacity duration-300 max-w-[calc(100%-1.5rem)] ${sheetOpen ? 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto' : 'opacity-100'}`}>
          <div className="bg-surface/90 backdrop-blur-xl rounded-2xl shadow-lg shadow-on-surface/10 border border-outline-variant/40 px-lg py-sm flex items-center gap-md">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-tertiary text-md">electric_bolt</span>
              <div>
                <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider leading-none">ETA</p>
                <p className="font-headline-md text-headline-md font-bold text-on-surface leading-tight whitespace-nowrap">
                  {locating ? '--' : `~${eta} min`}
                </p>
              </div>
            </div>
            <div className="h-8 w-px bg-outline-variant/50"></div>
            <div className="text-left pr-sm">
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider leading-none">Progress</p>
              <p className="font-headline-md text-headline-md font-bold text-primary leading-tight whitespace-nowrap">{progressPercent}%</p>
            </div>
            {/* mini progress bar */}
            <div className="w-16 sm:w-20 h-1.5 rounded-full bg-surface-container-high overflow-hidden shrink-0">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-all duration-1000 ease-in-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Geolocation error / demo banner */}
        {(geoError || error) && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 z-[1001] max-w-[92%]">
            <div className="bg-surface/90 backdrop-blur px-lg py-sm rounded-lg shadow border border-outline-variant text-center">
              <p className="font-label-sm text-label-sm text-on-surface-variant">{geoError || error}</p>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-[1002] bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-surface p-lg rounded-xl shadow-lg flex items-center gap-md">
              <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
              <span className="font-nav-item text-nav-item">Loading tracking data...</span>
            </div>
          </div>
        )}

        {/* Custom map controls (locate + zoom) — bottom-left, clears mobile pill */}
        <div className="absolute bottom-28 left-4 z-[1001] flex flex-col gap-2 md:bottom-4 md:left-4">
          <button
            onClick={locateMe}
            aria-label="My location"
            className="w-11 h-11 rounded-xl bg-surface/95 backdrop-blur border border-outline-variant/40 shadow-lg text-primary flex items-center justify-center hover:bg-surface-container-low transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">my_location</span>
          </button>
          <button
            onClick={zoomIn}
            aria-label="Zoom in"
            className="w-11 h-11 rounded-xl bg-surface/95 backdrop-blur border border-outline-variant/40 shadow-lg text-on-surface flex items-center justify-center hover:bg-surface-container-low transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
          <button
            onClick={zoomOut}
            aria-label="Zoom out"
            className="w-11 h-11 rounded-xl bg-surface/95 backdrop-blur border border-outline-variant/40 shadow-lg text-on-surface flex items-center justify-center hover:bg-surface-container-low transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">remove</span>
          </button>
        </div>

        {/* ============ DESKTOP / TABLET (md+): right-docked scrollable panel ============ */}
        <div className="hidden md:flex absolute top-20 right-4 bottom-4 z-[1001] w-[360px] max-w-[calc(100vw-2rem)] flex-col pointer-events-none">
          <div className="flex-1 min-h-0 overflow-y-auto pointer-events-auto space-y-lg pr-1 py-1">
            {/* Trip Progress */}
            <div className="bg-surface/95 backdrop-blur-xl p-lg rounded-2xl shadow-xl shadow-on-surface/10 border border-outline-variant/40">
              <div className="flex items-center justify-between mb-md">
                <h3 className="font-headline-md text-headline-md text-primary font-bold">Trip Progress</h3>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-label-sm text-label-sm font-bold flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[14px]">route</span>
                  {progressPercent}%
                </span>
              </div>

              <div className="h-2.5 rounded-full bg-surface-container-high overflow-hidden mb-lg">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-tertiary transition-all duration-1000 ease-in-out relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-primary shadow-md -mr-1"></div>
                </div>
              </div>

              <div className="space-y-md">
                <div className="flex items-start gap-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-md">trip_origin</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider leading-none">Dispatch</p>
                    <p className="font-body-md text-body-md text-on-surface font-medium leading-tight mt-0.5 break-words">{tracking?.origin?.label || 'FleetOS Dispatch Center'}</p>
                  </div>
                </div>
                <div className="ml-4 h-4 border-l-2 border-dashed border-outline-variant"></div>
                <div className="flex items-start gap-sm">
                  <div className="w-8 h-8 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-md" style={{ fontVariationSettings: "'FILL' 1" }}>home_work</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider leading-none">Destination</p>
                    <p className="font-body-md text-body-md text-on-surface font-medium leading-tight mt-0.5 break-words">{serviceLocationLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Technician card */}
            <TechCard
              selectedTech={selectedTech}
              avatar={getTechAvatar(selectedTech)}
              vehicleLabel={tracking?.vehicleLabel || 'Fleet Van #012'}
              service={tracking?.service || 'On-site Service'}
              reference={tracking?.reference || '—'}
              status={tracking?.status || 'in-progress'}
              eta={eta}
              onCall={() => window.location.href = 'tel:+15550001234'}
              onSms={() => window.location.href = 'sms:+15550001234'}
              onCancel={cancelBooking}
              onSupport={contactSupport}
              cancelling={cancelling}
            />

            {/* Stage Timeline */}
            <div className="bg-surface/95 backdrop-blur-xl p-lg rounded-2xl shadow-xl shadow-on-surface/10 border border-outline-variant/40">
              <div className="flex items-center justify-between mb-lg">
                <h3 className="font-headline-md text-headline-md text-primary font-bold">Journey Status</h3>
                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-bold uppercase tracking-wider">{primaryStage}</span>
              </div>
              <StageTimeline stageIndex={stageIndex} onComplete={() => navigate(ROUTES.serviceReview, { state: { selectedTech, bookingId } })} />
            </div>
          </div>
        </div>

        {/* ============ MOBILE / SMALL: compact bottom sheet ============ */}
        <div className={`md:hidden absolute bottom-0 left-0 right-0 z-[1001] transition-all duration-500 ease-in-out ${sheetOpen ? 'top-16' : ''}`}>
          {/* Collapsed handle bar */}
          {!sheetOpen && (
            <button
              onClick={() => setSheetOpen(true)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto bg-surface/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-on-surface/10 border border-outline-variant/30 px-lg py-sm flex items-center gap-md w-[calc(100%-2rem)] max-w-[420px]"
            >
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-primary/30 shrink-0">
                <img className="w-full h-full object-cover" alt={selectedTech} src={getTechAvatar(selectedTech)} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-nav-item text-nav-item text-on-surface font-bold leading-tight truncate">{selectedTech}</p>
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-tertiary text-[14px]">electric_bolt</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate">~{eta} min • {primaryStage}</span>
                </div>
              </div>
              <div className="flex items-center gap-sm shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <span className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-md">expand_less</span>
                </span>
              </div>
            </button>
          )}

          {/* Expanded sheet */}
          {sheetOpen && (
            <div className="absolute bottom-0 left-0 right-0 h-full rounded-t-3xl bg-surface shadow-2xl border-t border-outline-variant/50 flex flex-col overflow-hidden pointer-events-auto">
              {/* Drag handle */}
              <div className="w-full pt-3 pb-1 flex flex-col items-center gap-1 shrink-0" onClick={() => setSheetOpen(false)}>
                <div className="w-10 h-1.5 rounded-full bg-outline-variant"></div>
                <span className="font-label-sm text-label-sm text-outline">Tap to minimize</span>
              </div>

              <div className="flex-1 overflow-y-auto px-container-margin pb-8 space-y-lg">
                {/* ETA row */}
                <div className="bg-gradient-to-r from-primary-container to-surface-container-low rounded-2xl px-md py-sm flex items-center justify-between gap-sm">
                  <div className="flex items-center gap-sm min-w-0">
                    <span className="w-9 h-9 rounded-full bg-on-primary-container/10 text-on-primary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-md">electric_bolt</span>
                    </span>
                    <div>
                      <p className="font-label-sm text-label-sm text-on-primary-container/70 uppercase tracking-wider leading-none">Arriving in</p>
                      <p className="font-headline-md text-headline-md text-on-primary-container font-bold leading-tight">~{eta} mins</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-on-primary-container/10 text-on-primary-container rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">{primaryStage}</span>
                </div>

                {/* Progress block */}
                <div className="bg-surface-container-low rounded-2xl p-lg">
                  <div className="flex items-center justify-between mb-sm">
                    <h3 className="font-headline-md text-headline-md text-primary font-bold">Trip Progress</h3>
                    <span className="font-nav-item text-nav-item font-bold text-primary">{progressPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-all duration-1000 ease-in-out" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <div className="mt-md space-y-sm">
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-primary text-[16px] shrink-0">trip_origin</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant flex-1 break-words">{tracking?.origin?.label || 'Dispatch Center'}</span>
                    </div>
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-tertiary text-[16px] shrink-0">home_work</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant flex-1 break-words">{serviceLocationLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Technician card (mobile compact) */}
                <TechCard
                  selectedTech={selectedTech}
                  avatar={getTechAvatar(selectedTech)}
                  vehicleLabel={tracking?.vehicleLabel || 'Fleet Van #012'}
                  service={tracking?.service || 'On-site Service'}
                  reference={tracking?.reference || '—'}
                  status={tracking?.status || 'in-progress'}
                  eta={eta}
                  onCall={() => window.location.href = 'tel:+15550001234'}
                  onSms={() => window.location.href = 'sms:+15550001234'}
                  onCancel={cancelBooking}
                  onSupport={contactSupport}
                  cancelling={cancelling}
                />

                {/* Timeline */}
                <div className="bg-surface-container-low rounded-2xl p-lg">
                  <div className="flex items-center justify-between mb-md">
                    <h3 className="font-headline-md text-headline-md text-primary font-bold">Journey Status</h3>
                    <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">{primaryStage}</span>
                  </div>
                  <StageTimeline stageIndex={stageIndex} onComplete={() => navigate(ROUTES.serviceReview, { state: { selectedTech, bookingId } })} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Shared timeline component — refined vertical stepper
function StageTimeline({ stageIndex, onComplete }) {
  return (
    <div className="flex flex-col gap-0">
      {STAGE_ORDER.map((key, i) => {
        const done = i <= stageIndex;
        const active = i === stageIndex;
        return (
          <div key={key} className={`flex gap-md ${i < STAGE_ORDER.length - 1 ? 'h-14' : ''}`}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                done && !active ? 'bg-tertiary text-on-tertiary shadow-md shadow-tertiary/30' :
                active ? 'bg-primary text-on-primary shadow-md shadow-primary/40 scale-110' :
                'border-2 border-surface-variant bg-white text-outline'
              }`}>
                {done && !active ? (
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                ) : (
                  <span className="material-symbols-outlined text-[14px]" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {STAGE_ICONS[key]}
                  </span>
                )}
              </div>
              {i < STAGE_ORDER.length - 1 && (
                <div className={`w-0.5 grow transition-colors duration-500 ${done ? 'bg-tertiary' : 'bg-surface-variant'}`}></div>
              )}
            </div>
            <div className={`flex flex-col justify-center ${!done && !active ? 'opacity-50' : ''}`}>
              <span className={`font-nav-item text-nav-item ${active ? 'text-primary font-bold' : done ? 'text-on-surface font-semibold' : 'text-on-surface'}`}>
                {STAGE_LABELS[key]}
              </span>
              {active && (
                <span className="text-label-sm font-label-sm text-primary flex items-center gap-1">
                  <span className="animate-pulse">●</span> In progress
                </span>
              )}
              {done && !active && (
                <span className="text-label-sm font-label-sm text-outline">Completed</span>
              )}
            </div>
          </div>
        );
      })}
      <button
        onClick={onComplete}
        className="mt-3 w-full flex items-center justify-center gap-sm text-primary font-nav-item text-nav-item font-bold py-2 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20"
      >
        <span className="material-symbols-outlined text-sm">rate_review</span>
        Mark Completed (Demo)
      </button>
    </div>
  );
}

// Refined technician info card
function TechCard({ selectedTech, avatar, vehicleLabel, service, reference, status, eta, onCall, onSms, onCancel, onSupport, cancelling = false }) {
  return (
    <div className="bg-surface/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-on-surface/10 border border-outline-variant/30 overflow-hidden">
      {/* Header band */}
      <div className="flex items-center justify-between px-lg py-md bg-gradient-to-r from-primary/5 to-surface-container-low border-b border-outline-variant/20 gap-md">
        <div className="flex items-center gap-md min-w-0">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-sm shrink-0">
            <img className="w-full h-full object-cover" alt={selectedTech} src={avatar} />
          </div>
          <div className="min-w-0">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold leading-tight truncate">{selectedTech}</h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{vehicleLabel} • {service}</p>
          </div>
        </div>
        <div className="flex gap-sm shrink-0">
          <a href="tel:+15550001234" onClick={onCall} aria-label="Call" className="w-11 h-11 flex items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container hover:bg-surface-container-high transition-all active:scale-95">
            <span className="material-symbols-outlined">call</span>
          </a>
          <a href="sms:+15550001234" onClick={onSms} aria-label="Message" className="w-11 h-11 flex items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container hover:bg-surface-container-high transition-all active:scale-95">
            <span className="material-symbols-outlined">chat_bubble</span>
          </a>
        </div>
      </div>

      {/* Quick details */}
      <div className="px-lg py-md grid grid-cols-3 gap-md bg-surface-container-low/60">
        <div className="min-w-0">
          <span className="block text-label-sm text-label-sm text-outline uppercase tracking-wider">Reference</span>
          <span className="font-body-md text-body-md text-on-surface font-semibold truncate block">{reference}</span>
        </div>
        <div className="min-w-0">
          <span className="block text-label-sm text-label-sm text-outline uppercase tracking-wider">Status</span>
          <span className="font-body-md text-body-md text-on-surface font-semibold capitalize truncate block">{status.replace('-', ' ')}</span>
        </div>
        <div className="min-w-0">
          <span className="block text-label-sm text-label-sm text-outline uppercase tracking-wider">ETA</span>
          <span className="font-body-md text-body-md text-primary font-bold">~{eta} min</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-lg py-md flex gap-md border-t border-outline-variant/20">
        <button
          onClick={onCancel}
          disabled={cancelling}
          className="flex-1 py-3 bg-error-container text-on-error-container font-nav-item text-nav-item font-semibold rounded-xl flex items-center justify-center gap-sm hover:brightness-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {cancelling ? (
            <>
              <span className="material-symbols-outlined text-md animate-spin">progress_activity</span>
              Cancelling...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-md">close</span>
              Cancel
            </>
          )}
        </button>
        <button onClick={onSupport} className="flex-1 py-3 bg-surface-container-high text-on-surface-variant font-nav-item text-nav-item font-semibold rounded-xl flex items-center justify-center gap-sm hover:bg-surface-container-highest transition-all">
          <span className="material-symbols-outlined text-md">help_outline</span>
          Support
        </button>
      </div>
    </div>
  );
}

export default LiveTracking;

