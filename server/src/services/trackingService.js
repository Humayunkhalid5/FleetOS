const Booking = require('../models/Booking');

// Haversine distance (km) between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Interpolate a point along the great-circle-ish line between A and B
function interpolate(from, to, t) {
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

// Compute ETA minutes from remaining distance and speed (km/h)
function etaFromDistance(distanceKm, speedKmh = 40) {
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}

// Advance a booking's technician along the route by a small step.
// Returns the updated booking or null if not found / completed / cancelled.
async function advanceBooking(booking) {
  if (!booking) return null;
  if (['completed', 'cancelled'].includes(booking.status)) return null;
  if (booking.tracking.stage === 'completed') return null;

  const origin = booking.origin || { lat: 37.7749, lng: -122.4194 };
  const destination = booking.destination || { lat: 37.7894, lng: -122.3946 };
  const current = booking.currentPosition || { lat: origin.lat, lng: origin.lng };

  const totalDistance = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const traveled = haversineKm(origin.lat, origin.lng, current.lat, current.lng);
  const progress = totalDistance > 0 ? traveled / totalDistance : 0;

  const speedStep = 0.02 + Math.random() * 0.03; // per tick (~4s)

  if (booking.tracking.stage === 'assigned') {
    booking.tracking.stage = 'on-the-way';
  }

  if (progress >= 0.9 && booking.tracking.stage === 'on-the-way') {
    // Arrived near destination
    booking.tracking.stage = 'arrived';
    booking.currentPosition = { lat: destination.lat, lng: destination.lng, updatedAt: new Date() };
    booking.tracking.etaMinutes = 1;
  } else if (progress < 1) {
    const nextProgress = Math.min(1, progress + speedStep);
    const t = nextProgress;
    const nextPos = interpolate(origin, destination, t);
    booking.currentPosition = { lat: nextPos.lat, lng: nextPos.lng, updatedAt: new Date() };
    const remainingKm = haversineKm(nextPos.lat, nextPos.lng, destination.lat, destination.lng);
    booking.tracking.etaMinutes = etaFromDistance(remainingKm);
  }

  // Optional: move into "working" shortly after arrival for demo richness
  if (booking.tracking.stage === 'arrived' && booking.tracking.etaMinutes <= 1) {
    // Keep arrived; a later tick can mark working via PATCH or simulator
  }

  await booking.save();
  return booking;
}

// Update an existing booking's live position via PATCH (manual/sim)
async function updateBookingPosition(booking, position) {
  if (!booking) return null;
  booking.currentPosition = {
    lat: Number(position.lat) || booking.currentPosition.lat,
    lng: Number(position.lng) || booking.currentPosition.lng,
    updatedAt: new Date(),
  };
  if (position.stage) booking.tracking.stage = position.stage;
  if (position.etaMinutes !== undefined) booking.tracking.etaMinutes = Number(position.etaMinutes);
  await booking.save();
  return booking;
}

module.exports = {
  haversineKm,
  interpolate,
  etaFromDistance,
  advanceBooking,
  updateBookingPosition,
};

