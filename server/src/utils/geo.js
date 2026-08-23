const PAKISTAN_CENTER = { lat: 30.3753, lng: 69.3451, label: 'Pakistan' };

const CITY_COORDS = [
  ['karachi', 24.8607, 67.0011],
  ['lahore', 31.5204, 74.3587],
  ['islamabad', 33.6844, 73.0479],
  ['rawalpindi', 33.5651, 73.0169],
  ['faisalabad', 31.4504, 73.1350],
  ['multan', 30.1575, 71.5249],
  ['peshawar', 34.0151, 71.5249],
  ['quetta', 30.1798, 66.9750],
  ['sialkot', 32.4945, 74.5229],
  ['gujranwala', 32.1877, 74.1945],
  ['hyderabad', 25.3960, 68.3578],
  ['bahawalpur', 29.3956, 71.6836],
  ['sukkur', 27.7052, 68.8574],
  ['abbottabad', 34.1688, 73.2215],
  ['murree', 33.9070, 73.3943],
].map(([key, lat, lng]) => ({ key, lat, lng }));

function cleanLabel(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') return [value.address, value.area, value.city, value.location].filter(Boolean).join(', ').trim();
  return String(value).trim();
}

function coordsForLocation(value, fallbackLabel = 'Service location') {
  const label = cleanLabel(value) || fallbackLabel;
  const input = label.toLowerCase();
  const match = CITY_COORDS.find((city) => input.includes(city.key));
  if (match) return { lat: match.lat, lng: match.lng, label };
  return { ...PAKISTAN_CENTER, label };
}

function offsetCoords(point, latOffset = 0.035, lngOffset = -0.035, label = 'Technician dispatch point') {
  const base = point || PAKISTAN_CENTER;
  return {
    lat: Number((Number(base.lat) + latOffset).toFixed(6)),
    lng: Number((Number(base.lng) + lngOffset).toFixed(6)),
    label,
  };
}

module.exports = {
  PAKISTAN_CENTER,
  coordsForLocation,
  offsetCoords,
};
