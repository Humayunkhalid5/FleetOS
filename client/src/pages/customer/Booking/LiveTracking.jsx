import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { ROUTES } from '../../../constants';
import api, { getActiveSessionToken } from '../../../services/api';
import CustomerTopNav from '../../../components/customer/CustomerTopNav';
import 'leaflet/dist/leaflet.css';

const PAKISTAN_CENTER = { lat: 30.3753, lng: 69.3451, label: 'Pakistan' };
const CITY_COORDS = [
  ['karachi', 24.8607, 67.0011], ['lahore', 31.5204, 74.3587], ['islamabad', 33.6844, 73.0479],
  ['rawalpindi', 33.5651, 73.0169], ['faisalabad', 31.4504, 73.1350], ['multan', 30.1575, 71.5249],
  ['peshawar', 34.0151, 71.5249], ['quetta', 30.1798, 66.9750], ['sialkot', 32.4945, 74.5229],
].map(([key, lat, lng]) => ({ key, lat, lng }));

const isValidPoint = (point) => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng));
const toPoint = (point, fallback = null) => isValidPoint(point) ? { ...point, lat: Number(point.lat), lng: Number(point.lng) } : fallback;
const coordsFromText = (value) => {
  const label = String(value || '').trim();
  const match = CITY_COORDS.find((city) => label.toLowerCase().includes(city.key));
  return match ? { lat: match.lat, lng: match.lng, label } : null;
};
const offsetCoords = (point, label = 'Company dispatch point') => ({
  lat: Number((Number(point?.lat || PAKISTAN_CENTER.lat) + 0.035).toFixed(6)),
  lng: Number((Number(point?.lng || PAKISTAN_CENTER.lng) - 0.035).toFixed(6)),
  label,
});

const createTrackingIcon = (type, icon) =>
  L.divIcon({
    className: `fleet-tracking-pin fleet-tracking-pin--${type}`,
    html: `
      <span class="fleet-tracking-pin__pulse"></span>
      <span class="fleet-tracking-pin__body">
        <span class="material-symbols-outlined">${icon}</span>
      </span>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

const createTechIcon = () => createTrackingIcon('tech', 'badge');
const createUserIcon = () => createTrackingIcon('user', 'my_location');
const createDestinationIcon = () => createTrackingIcon('destination', 'home_work');
const createOriginDot = () => L.divIcon({ className: 'origin-marker', html: '<span class="fleet-tracking-dot"></span>', iconSize: [16, 16], iconAnchor: [8, 8] });
const STAGE_ORDER = ['assigned', 'on-the-way', 'arrived', 'working', 'completed'];
const STAGE_LABELS = { assigned: 'Assigned', 'on-the-way': 'On the Way', arrived: 'Arrived', working: 'Working', completed: 'Completed' };
const STAGE_ICONS = { assigned: 'assignment', 'on-the-way': 'near_me', arrived: 'location_on', working: 'construction', completed: 'task_alt' };
const stageForStatus = (status) => ({
  Assigned: 'assigned',
  'En Route': 'on-the-way',
  Arrived: 'arrived',
  'In Progress': 'working',
  Completed: 'completed',
  Paid: 'completed',
}[status] || 'assigned');

const phoneHref = (scheme, value) => {
  const phone = String(value || '').replace(/[^\d+]/g, '');
  return phone ? `${scheme}:${phone}` : undefined;
};

const normalizeTracking = (payload, status, technician) => {
  const destination = toPoint(payload?.destination) || coordsFromText(payload?.location) || PAKISTAN_CENTER;
  const currentPosition = toPoint({ lat: payload?.lat, lng: payload?.lng }) || toPoint(payload?.origin) || offsetCoords(destination);
  return {
    ...payload,
    status,
    technician,
    origin: toPoint(payload?.origin) || currentPosition,
    destination,
    currentPosition,
  };
};

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
  // Keep the selected booking in the URL as well as route state. Route state
  // disappears after a browser refresh, which previously left the tracking
  // screen detached from the company's live updates.
  const bookingId = location.state?.bookingId || new URLSearchParams(location.search).get('bookingId') || null;
  const [selectedTech, setSelectedTech] = useState(location.state?.selectedTech || 'Assigned staff member');

  // Map state
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  // Tracking state
  const [tracking, setTracking] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [locating, setLocating] = useState(true);
  const [geoError, setGeoError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eta, setEta] = useState(0);
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

// Move the assigned staff marker smoothly
  const moveTechMarker = useCallback((pos) => {
    if (!mapRef.current || !techMarkerRef.current) return;
    techMarkerRef.current.setLatLng([Number(pos.lat), Number(pos.lng)]);
  }, []);

  // ------------- 1. Fetch booking tracking data -------------
  const fetchTracking = useCallback(async (id) => {
    if (!id) {
      setLoading(false);
      setError('Choose a booking from Booking History to view its authorized tracking feed.');
      return;
    }
    try {
      const response = await api.get(`/bookings/${id}/tracking`);
      const data = response.tracking;
      setTracking(normalizeTracking(data, data.status, data.technician));
      setSelectedTech(data.technician?.name || 'Assigned staff member');
      setEta(data.etaMinutes ?? 0);
      setStage(stageForStatus(data.status));
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load the persisted tracking data.');
    } finally {
      setLoading(false);
    }
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
      () => {
        setGeoError('Unable to access your location. Showing approximate location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
    );
  }, []);

  // ------------- 3. Initialize Leaflet map once -------------
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return undefined;

    const firstPoint = PAKISTAN_CENTER;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([firstPoint.lat, firstPoint.lng], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      detectRetina: true,
      crossOrigin: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    const invalidate = () => map.invalidateSize({ animate: false });
    const t = setTimeout(invalidate, 200);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(invalidate) : null;
    resizeObserver?.observe(mapContainerRef.current);
    window.addEventListener('resize', invalidate);

    return () => {
      clearTimeout(t);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', invalidate);
      map.remove();
      mapRef.current = null;
      techMarkerRef.current = null;
      userMarkerRef.current = null;
      routePolylineRef.current = null;
      mapFitDoneRef.current = false;
    };
  }, []);

  // ------------- 4. Keep markers, route, and bounds synced -------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const techPoint = tracking?.currentPosition || (tracking?.destination ? offsetCoords(tracking.destination) : null);
    const destinationPoint = tracking?.destination || userPos || PAKISTAN_CENTER;
    const routePoints = [];

    if (techPoint) {
      const latlng = [techPoint.lat, techPoint.lng];
      if (!techMarkerRef.current) {
        techMarkerRef.current = L.marker(latlng, { icon: createTechIcon() }).addTo(map).bindTooltip('Assigned staff live location', { direction: 'top', offset: [0, -10] });
      } else {
        techMarkerRef.current.setLatLng(latlng);
      }
      routePoints.push(latlng);
    }

    if (!map.originMarker && tracking?.origin) {
      map.originMarker = L.marker([tracking.origin.lat, tracking.origin.lng], { icon: createOriginDot() })
        .addTo(map)
        .bindTooltip(tracking.origin.label || 'Dispatch point', { direction: 'top', offset: [0, -8] });
    }

    if (destinationPoint) {
      const latlng = [destinationPoint.lat, destinationPoint.lng];
      if (!map.destinationMarker) {
        map.destinationMarker = L.marker(latlng, { icon: createDestinationIcon() })
          .addTo(map)
          .bindTooltip(destinationPoint.label || serviceLocationLabel, { direction: 'top', offset: [0, -10] });
      } else {
        map.destinationMarker.setLatLng(latlng);
        map.destinationMarker.setTooltipContent(destinationPoint.label || serviceLocationLabel);
      }
      routePoints.push(latlng);
    }

    if (userPos) {
      const latlng = [userPos.lat, userPos.lng];
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(latlng, { icon: createUserIcon() }).addTo(map).bindTooltip('Your current GPS location', { direction: 'top', offset: [0, -10] });
      } else {
        userMarkerRef.current.setLatLng(latlng);
      }
    }

    if (routePoints.length > 1 && haversineKm({ lat: routePoints[0][0], lng: routePoints[0][1] }, { lat: routePoints[1][0], lng: routePoints[1][1] }) > 0.02) {
      if (!routePolylineRef.current) {
        routePolylineRef.current = L.polyline(routePoints, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.72,
          dashArray: '10 10',
          lineCap: 'round',
        }).addTo(map);
      } else {
        routePolylineRef.current.setLatLngs(routePoints);
      }
    }

    const boundsPoints = [...routePoints, ...(userPos ? [[userPos.lat, userPos.lng]] : [])];
    const fitKey = boundsPoints.map(([lat, lng]) => `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`).join('|');
    if (boundsPoints.length > 1 && mapFitDoneRef.current !== fitKey) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [70, 70], maxZoom: 15 });
      mapFitDoneRef.current = fitKey;
    } else if (boundsPoints.length === 1 && mapFitDoneRef.current !== fitKey) {
      map.flyTo(boundsPoints[0], 13, { duration: 0.6 });
      mapFitDoneRef.current = fitKey;
    }
  }, [serviceLocationLabel, tracking, userPos]);
  // ------------- 5. Socket.io live tracking -------------
  useEffect(() => {
    const id = bookingIdRef.current;
    if (!id) return;

    let socket;
    try {
      socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        withCredentials: true,
        auth: { token: getActiveSessionToken() },
        transports: ['websocket', 'polling'],
      });
    } catch {
      return;
    }
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join-booking', id));

    socket.on('tracking:snapshot', (data) => {
      if (!data) return;
      const normalized = normalizeTracking(data.tracking, data.status, data.technician);
      setTracking(normalized);
      setSelectedTech((prev) => data.technician?.name || prev);
      setEta(data.tracking?.etaMinutes ?? 0);
      setStage(stageForStatus(data.status));
      if (normalized.currentPosition) moveTechMarker(normalized.currentPosition);
    });

    socket.on('tracking:update', (data) => {
      if (!data) return;
      const normalized = normalizeTracking(data.tracking, data.status, data.technician);
      setTracking(normalized);
      setEta(data.tracking?.etaMinutes ?? 0);
      setStage(stageForStatus(data.status));
      if (normalized.currentPosition) moveTechMarker(normalized.currentPosition);
    });

    // A company changes the job lifecycle (Assigned → En Route → Arrived,
    // etc.) through the booking API. That is a booking event rather than a
    // GPS event, so refresh the persisted tracking snapshot on either update.
    // The client remains read-only: it can view progress or cancel an eligible
    // request, but it cannot mark technician stages.
    socket.on('booking:updated', (data) => {
      if (String(data?.bookingId || '') === String(id)) fetchTracking(id);
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
  }, [bookingId, fetchTracking, moveTechMarker]);

  const shareBooking = () => {
    const shareData = { title: 'FleetOS Live Tracking', text: `Track your service request with ${selectedTech}`, url: window.location.href };
    if (navigator.share) navigator.share(shareData).catch(() => {});
    else navigator.clipboard?.writeText(window.location.href);
  };

  const [cancelling, setCancelling] = useState(false);

  const cancelBooking = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      if (!bookingId) throw new Error('No booking selected');
      await api.patch(`/bookings/${bookingId}`, { status: 'cancelled' });
      setError('');
      setTimeout(() => navigate(ROUTES.bookings), 600);
    } catch (err) {
      setError(err.message || 'The booking could not be cancelled.');
    } finally {
      setCancelling(false);
    }
  };

  const openBookingChat = () => navigate(ROUTES.chat, { state: { bookingId } });

  // Map controls
  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();
  const locateMe = () => {
    if (!mapRef.current) return;
    if (userPos) mapRef.current.flyTo([userPos.lat, userPos.lng], 14, { duration: 1 });
    else setGeoError('Your location is not available yet.');
  };

  const getTechAvatar = (name) => {
    if (name === 'Ayesha Khan') return "https://lh3.googleusercontent.com/aida-public/AB6AXuDnCiWvnkOKQReJfbwVPnaN6tu7s5397gTYSVBPMyiX6toCf8p5wo3eRuZ2QIc2TqcZrm-1vI7JyRT7oqpSWXpAdRECBDCnRGuLQM6zGzCDYi5wegUEzJG2p7E7E7jfdx9hSCUUoveU458OaY-di3G4frMSjmTJwjSznLPYXVl_zY_nMTuD0q3drMrje1gMak8VTFXTBe687naWHZTIHqBAHuyZqtzAN7B6ZysOa9vPYFnRqmNuHtlY1A";
    if (name === 'Bilal Ahmed') return "https://lh3.googleusercontent.com/aida-public/AB6AXuBdSq9kds-9hvrnwo749V1I2EinNun7_8MX5BIE5-IMKUNAe4eYNSZlRYfJsQoPN6Bhr_Si7Oj9uq3XH8CcF0q8t2BSjIFBI_5A248PGaEjKqs1N1rbNOcqGh-pFfZ5qZmC7dv0k7AJ0lOUJGzjeGN4P8Z_QnnObTriizg6iqp9D11hzs6aSOcdIpfpF8Q04gH3UJwNaz_BNK0OIH9K1hLW_V9CsATPDG8NQAVE-f5Eg0eDZhdoGe4WAg";
    return "https://lh3.googleusercontent.com/aida-public/AB6AXuCYZfr7LM0amt7amV3qWRzvkJ0chN1P5Vl4ak4XWMFLv9cR1dVSKVEJboF-5wik_OaBGzQbe_f9zpEDGNelEXwpkwhRfCDzu2VSrcVbR395XicT3b4RJGvpMzH7XsiTXzbp8fwwVFQA-OcMy3Ox3onCOIgmS8yJsUido-6p-h_pNhdIOAC7ZJCIlrbfYLmHnHtdBJI5wRv0L98ng9SZ93ikcBUnCdIyedi614HkAnkqrcIDLX7mQr8uRg";
  };

  const primaryStage = STAGE_LABELS[stage] || 'Assigned';
  const progressPercent = stage === 'completed' ? 100 : progressPct;
  const contactPhone = tracking?.technician?.phone || tracking?.company?.phone || '';
  const unavailableContact = () => setError('Contact number is not available yet. It will appear once the company assigns staff.');

  return (
    <div className="client-dashboard-shell live-tracking-root fixed inset-0 bg-background text-on-surface font-body-md">
      <CustomerTopNav title="Live tracking" subtitle={`Current status: ${primaryStage}`} backTo="" actions={<button onClick={shareBooking} className="client-nav-icon material-symbols-outlined" aria-label="Share booking">share</button>} />

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
                <h3 className="font-headline-md text-headline-md text-primary font-bold">Request Progress</h3>
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
                    <p className="font-body-md text-body-md text-on-surface font-medium leading-tight mt-0.5 break-words">{tracking?.origin?.label || 'Company Dispatch Center'}</p>
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

            {/* Assigned staff card */}
            <TechCard
              selectedTech={selectedTech}
              avatar={getTechAvatar(selectedTech)}
              vehicleLabel={tracking?.vehicleLabel || 'Company Staff'}
              service={tracking?.service || 'On-site Service'}
              reference={tracking?.reference || '—'}
              status={tracking?.status || 'in-progress'}
              eta={eta}
              contactPhone={contactPhone}
              onMissingContact={unavailableContact}
              onCancel={cancelBooking}
              onChat={openBookingChat}
              cancelling={cancelling}
            />

            {/* Stage Timeline */}
            <div className="bg-surface/95 backdrop-blur-xl p-lg rounded-2xl shadow-xl shadow-on-surface/10 border border-outline-variant/40">
              <div className="flex items-center justify-between mb-lg">
                <h3 className="font-headline-md text-headline-md text-primary font-bold">Journey Status</h3>
                <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-bold uppercase tracking-wider">{primaryStage}</span>
              </div>
              <StageTimeline stageIndex={stageIndex} onComplete={() => navigate(`${ROUTES.serviceReview}?bookingId=${bookingId}`, { state: { selectedTech, bookingId } })} />
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
                    <h3 className="font-headline-md text-headline-md text-primary font-bold">Request Progress</h3>
                    <span className="font-nav-item text-nav-item font-bold text-primary">{progressPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-all duration-1000 ease-in-out" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <div className="mt-md space-y-sm">
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-primary text-[16px] shrink-0">trip_origin</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant flex-1 break-words">{tracking?.origin?.label || 'Company Dispatch Center'}</span>
                    </div>
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-tertiary text-[16px] shrink-0">home_work</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant flex-1 break-words">{serviceLocationLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Assigned staff card (mobile compact) */}
                <TechCard
                  selectedTech={selectedTech}
                  avatar={getTechAvatar(selectedTech)}
                  vehicleLabel={tracking?.vehicleLabel || 'Company Staff'}
                  service={tracking?.service || 'On-site Service'}
                  reference={tracking?.reference || '—'}
                  status={tracking?.status || 'in-progress'}
                  eta={eta}
                  contactPhone={contactPhone}
                  onMissingContact={unavailableContact}
                  onCancel={cancelBooking}
                  onChat={openBookingChat}
                  cancelling={cancelling}
                />

                {/* Timeline */}
                <div className="bg-surface-container-low rounded-2xl p-lg">
                  <div className="flex items-center justify-between mb-md">
                    <h3 className="font-headline-md text-headline-md text-primary font-bold">Journey Status</h3>
                    <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">{primaryStage}</span>
                  </div>
                  <StageTimeline stageIndex={stageIndex} onComplete={() => navigate(`${ROUTES.serviceReview}?bookingId=${bookingId}`, { state: { selectedTech, bookingId } })} />
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
        className="tracking-review-action mt-3 w-full flex items-center justify-center gap-sm font-nav-item text-nav-item font-bold py-2 rounded-xl transition-colors"
      >
        <span className="material-symbols-outlined text-sm">rate_review</span>
        Review completed job
      </button>
    </div>
  );
}

// Refined assigned staff info card
function TechCard({ selectedTech, avatar, vehicleLabel, service, reference, status, eta, contactPhone, onMissingContact, onCancel, onChat, cancelling = false }) {
  const callLink = phoneHref('tel', contactPhone);
  const smsLink = phoneHref('sms', contactPhone);
  const guardContact = (event) => {
    if (!contactPhone) {
      event.preventDefault();
      onMissingContact?.();
    }
  };
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
          <a href={callLink || '#'} onClick={guardContact} aria-label="Call" className="w-11 h-11 flex items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container hover:bg-surface-container-high transition-all active:scale-95">
            <span className="material-symbols-outlined">call</span>
          </a>
          <a href={smsLink || '#'} onClick={guardContact} aria-label="Message" className="w-11 h-11 flex items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container hover:bg-surface-container-high transition-all active:scale-95">
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
        <button onClick={onChat} className="flex-1 py-3 bg-surface-container-high text-on-surface-variant font-nav-item text-nav-item font-semibold rounded-xl flex items-center justify-center gap-sm hover:bg-surface-container-highest transition-all">
          <span className="material-symbols-outlined text-md">forum</span>
          Chat Company
        </button>
      </div>
    </div>
  );
}

export default LiveTracking;










