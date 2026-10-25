import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const PAKISTAN = [30.3753, 69.3451];
const valid = (point) => point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng));
const pin = (kind, icon) => L.divIcon({
  className: '',
  html: `<span class="map-pin map-pin--${kind}"><span class="map-pin__pulse"></span><span class="map-pin__body"><span class="material-symbols-outlined">${icon}</span></span></span>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

/**
 * Leaflet map showing staff position, destination and (optionally) the
 * customer's own location. Markers move in place; the map is created once.
 */
export default function TrackingMap({ staff, destination, me, className = '', fitKey }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layers = useRef({});
  const fitted = useRef('');

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return undefined;
    // Wheel zoom only after the map is clicked, so scrolling the page past it
    // never zooms the map by accident.
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false }).setView(PAKISTAN, 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.on('click focus', () => map.scrollWheelZoom.enable());
    map.on('mouseout blur', () => map.scrollWheelZoom.disable());
    mapRef.current = map;
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; layers.current = {}; fitted.current = ''; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const place = (key, point, kind, icon, label) => {
      if (!valid(point)) { layers.current[key]?.remove(); delete layers.current[key]; return null; }
      const latlng = [Number(point.lat), Number(point.lng)];
      if (layers.current[key]) layers.current[key].setLatLng(latlng);
      else layers.current[key] = L.marker(latlng, { icon: pin(kind, icon) }).addTo(map).bindTooltip(label, { direction: 'top', offset: [0, -16] });
      return latlng;
    };
    const a = place('staff', staff, 'staff', 'engineering', 'Assigned staff');
    const b = place('destination', destination, 'destination', 'home_pin', destination?.label || 'Service address');
    const c = place('me', me, 'me', 'person_pin_circle', 'You are here');

    const line = [a, b].filter(Boolean);
    if (line.length === 2) {
      if (layers.current.route) layers.current.route.setLatLngs(line);
      else layers.current.route = L.polyline(line, { color: `rgb(${getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '37 99 235'})`, weight: 4, opacity: 0.8, dashArray: '8 10', lineCap: 'round' }).addTo(map);
    } else { layers.current.route?.remove(); delete layers.current.route; }

    const points = [a, b, c].filter(Boolean);
    const key = fitKey ?? points.map((p) => p.map((n) => n.toFixed(3)).join(',')).join('|');
    if (points.length && fitted.current !== key) {
      if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 15 });
      else map.setView(points[0], 13);
      fitted.current = key;
    }
  }, [staff, destination, me, fitKey]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} />;
}
