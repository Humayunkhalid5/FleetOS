import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const LAHORE = { lat: 31.5204, lng: 74.3587, label: 'Lahore, Pakistan' };

const isValidPoint = (point) =>
  point &&
  Number.isFinite(Number(point.lat)) &&
  Number.isFinite(Number(point.lng)) &&
  Math.abs(Number(point.lat)) <= 90 &&
  Math.abs(Number(point.lng)) <= 180;

const toPoint = (point, fallback = null) =>
  isValidPoint(point)
    ? { ...point, lat: Number(point.lat), lng: Number(point.lng) }
    : fallback;

const createMapPin = (type, icon) =>
  L.divIcon({
    className: `fleet-map-marker fleet-map-marker--${type}`,
    html: `
      <span class="fleet-map-marker__pulse"></span>
      <span class="fleet-map-marker__body">
        <span class="material-symbols-outlined">${icon}</span>
      </span>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

export function ClientMap({
  center = null,
  zoom = 13,
  className = 'w-full h-64 rounded-xl overflow-hidden shadow-sm border border-outline-variant',
  onLocationFound = null,
  showUserPin = true,
  destination = null,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const fitKeyRef = useRef('');

  const [userPos, setUserPos] = useState(() => toPoint(center));
  const [locating, setLocating] = useState(true);
  const [geoError, setGeoError] = useState('');
  const [tileError, setTileError] = useState(false);

  const destinationPoint = useMemo(() => toPoint(destination), [destination]);
  const initialCenter = useMemo(
    () => toPoint(center) || userPos || destinationPoint || LAHORE,
    [center, destinationPoint, userPos],
  );

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      const timer = window.setTimeout(() => {
        setGeoError('Location is unavailable in this browser. Showing an approximate Pakistan location.');
        setLocating(false);
        setUserPos((current) => current || toPoint(center) || LAHORE);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your location' };
        setUserPos(coords);
        setGeoError('');
        setLocating(false);
        onLocationFound?.(coords);
      },
      () => {
        setGeoError('Location permission is off. Showing the nearest known service area.');
        setLocating(false);
        setUserPos((current) => current || toPoint(center) || destinationPoint || LAHORE);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    }).setView([initialCenter.lat, initialCenter.lng], zoom);

    tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      detectRetina: true,
      crossOrigin: true,
      attribution: '&copy; OpenStreetMap contributors',
    })
      .on('tileerror', () => setTileError(true))
      .addTo(map);

    mapRef.current = map;

    const invalidate = () => map.invalidateSize({ animate: false });
    const timer = window.setTimeout(invalidate, 180);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(invalidate)
      : null;
    resizeObserver?.observe(mapContainerRef.current);
    window.addEventListener('resize', invalidate);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', invalidate);
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      userMarkerRef.current = null;
      destinationMarkerRef.current = null;
      routeLineRef.current = null;
      fitKeyRef.current = '';
    };
  }, [initialCenter.lat, initialCenter.lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const points = [];

    if (showUserPin && userPos) {
      const latLng = [userPos.lat, userPos.lng];
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(latLng, { icon: createMapPin('user', 'my_location') })
          .addTo(map)
          .bindTooltip('Your location', { direction: 'top', offset: [0, -12] });
      } else {
        userMarkerRef.current.setLatLng(latLng);
      }
      points.push(latLng);
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (destinationPoint) {
      const latLng = [destinationPoint.lat, destinationPoint.lng];
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = L.marker(latLng, { icon: createMapPin('destination', 'storefront') })
          .addTo(map)
          .bindTooltip(destinationPoint.label || 'Service destination', { direction: 'top', offset: [0, -12] });
      } else {
        destinationMarkerRef.current.setLatLng(latLng);
        destinationMarkerRef.current.setTooltipContent(destinationPoint.label || 'Service destination');
      }
      points.push(latLng);
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    if (userPos && destinationPoint) {
      const route = [[userPos.lat, userPos.lng], [destinationPoint.lat, destinationPoint.lng]];
      if (!routeLineRef.current) {
        routeLineRef.current = L.polyline(route, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.72,
          dashArray: '10 10',
          lineCap: 'round',
        }).addTo(map);
      } else {
        routeLineRef.current.setLatLngs(route);
      }
    } else if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    const fitKey = points.map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`).join('|');
    if (points.length > 1 && fitKeyRef.current !== fitKey) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
      fitKeyRef.current = fitKey;
    } else if (points.length === 1 && fitKeyRef.current !== fitKey) {
      map.flyTo(points[0], zoom, { duration: 0.6 });
      fitKeyRef.current = fitKey;
    }
  }, [destinationPoint, showUserPin, userPos, zoom]);

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    const points = [userPos, destinationPoint].filter(Boolean).map((point) => [point.lat, point.lng]);
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
    else if (points.length === 1) map.flyTo(points[0], 15, { duration: 0.65 });
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-100" />

      {locating && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700">
          <span className="material-symbols-outlined animate-spin text-blue-600">progress_activity</span>
          Detecting your location...
        </div>
      )}

      {(userPos || destinationPoint) && (
        <button
          type="button"
          onClick={recenter}
          className="absolute bottom-3 right-3 z-10 p-2.5 bg-white rounded-xl shadow-lg border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors"
          title="Fit map to route"
        >
          <span className="material-symbols-outlined text-[20px]">my_location</span>
        </button>
      )}

      {(geoError || tileError) && (
        <div className="absolute top-3 left-3 right-3 z-10 bg-white/95 px-3 py-2 rounded-xl text-xs text-slate-600 text-center border border-slate-200 shadow-sm">
          {tileError ? 'Map tiles are having trouble loading. Check internet access for OpenStreetMap.' : geoError}
        </div>
      )}
    </div>
  );
}

export default ClientMap;
