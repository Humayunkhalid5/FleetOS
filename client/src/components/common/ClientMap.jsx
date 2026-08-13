import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom user pin icon (pulsing blue dot)
const createUserPin = () =>
  L.divIcon({
    className: 'client-user-pin',
    html: `
      <div class="relative">
        <div class="absolute -inset-2 rounded-full bg-primary/30 animate-ping"></div>
        <div class="w-8 h-8 rounded-full bg-white shadow-lg border-2 border-primary flex items-center justify-center relative">
          <span class="material-symbols-outlined text-primary" style="font-size:18px;font-variationSettings:'FILL' 1">my_location</span>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

// Custom destination / company pin icon
const createDestinationPin = (label = 'Service Location') =>
  L.divIcon({
    className: 'client-dest-pin',
    html: `
      <div class="relative">
        <div class="w-10 h-10 rounded-full bg-white shadow-xl border-2 border-tertiary flex items-center justify-center relative">
          <span class="material-symbols-outlined text-tertiary" style="font-size:22px;font-variationSettings:'FILL' 1">storefront</span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
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
  const userMarkerRef = useRef(null);

  const [userPos, setUserPos] = useState(center);
  const [locating, setLocating] = useState(true);
  const [geoError, setGeoError] = useState('');

  // 1. Get real client coordinates from browser Geolocation
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation not supported');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(coords);
        setLocating(false);
        if (onLocationFound) onLocationFound(coords);
      },
      (err) => {
        setGeoError('Location permission denied or unavailable');
        setLocating(false);
        // Fallback default: Lahore center if none provided
        if (!userPos && !center) {
          setUserPos({ lat: 31.5204, lng: 74.3587 });
        }
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter = userPos || center || { lat: 31.5204, lng: 74.3587 };
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([initialCenter.lat, initialCenter.lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    // Invalidate size after mount to prevent grey blank box
    const timer = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 3. Update map center and markers when userPos changes
  useEffect(() => {
    if (!mapRef.current || !userPos) return;
    const map = mapRef.current;

    if (showUserPin) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userPos.lat, userPos.lng], { icon: createUserPin() })
          .addTo(map)
          .bindTooltip('Your Real Location', { permanent: false });
      } else {
        userMarkerRef.current.setLatLng([userPos.lat, userPos.lng]);
      }
    }

    if (destination) {
      L.marker([destination.lat, destination.lng], {
        icon: createDestinationPin(destination.label),
      })
        .addTo(map)
        .bindTooltip(destination.label || 'Destination', { permanent: true });

      const bounds = L.latLngBounds([[userPos.lat, userPos.lng], [destination.lat, destination.lng]]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([userPos.lat, userPos.lng], zoom);
    }
  }, [userPos, destination, showUserPin, zoom]);

  const recenter = () => {
    if (mapRef.current && userPos) {
      mapRef.current.flyTo([userPos.lat, userPos.lng], 15);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-surface-container-high" />

      {locating && (
        <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm z-10 flex items-center justify-center gap-sm font-label-sm text-label-sm text-on-surface">
          <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
          Detecting your real location...
        </div>
      )}

      {userPos && (
        <button
          type="button"
          onClick={recenter}
          className="absolute bottom-3 right-3 z-10 p-2 bg-white rounded-lg shadow-md border border-outline-variant text-primary hover:bg-surface-container-low transition-colors"
          title="Recenter to my location"
        >
          <span className="material-symbols-outlined text-[20px]">my_location</span>
        </button>
      )}

      {geoError && (
        <div className="absolute top-2 left-2 right-2 z-10 bg-surface-container-lowest/90 px-sm py-xs rounded text-xs text-on-surface-variant text-center border border-outline-variant shadow-sm">
          📍 {geoError}
        </div>
      )}
    </div>
  );
}

export default ClientMap;
