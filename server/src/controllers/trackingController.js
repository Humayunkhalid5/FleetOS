const Booking = require('../models/Booking');
const { coordsForLocation, offsetCoords } = require('../utils/geo');

function filterFor(req) {
  return req.user.role === 'customer'
    ? { customer: req.user._id }
    : { company: req.user.company?._id || req.user.company };
}

exports.getTracking = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, ...filterFor(req) })
    .populate('technician', 'name phone avatar status currentLocation')
    .populate('company', 'name city location')
    .select('reference status tracking technician vehicle company customer location serviceSnapshot updatedAt')
    .lean();
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  const stale = !booking.tracking?.updatedAt || Date.now() - new Date(booking.tracking.updatedAt).getTime() > 5 * 60 * 1000;
  const destination = coordsForLocation(booking.location || booking.company?.city, booking.location || 'Service location');
  const origin = Number.isFinite(Number(booking.tracking?.lat)) && Number.isFinite(Number(booking.tracking?.lng))
    ? { lat: Number(booking.tracking.lat), lng: Number(booking.tracking.lng), label: 'Technician current location' }
    : offsetCoords(destination);
  return res.json({
    tracking: {
      ...booking.tracking,
      lat: origin.lat,
      lng: origin.lng,
      origin,
      destination,
      location: booking.location,
      service: booking.serviceSnapshot?.name,
      reference: booking.reference,
      status: booking.status,
      technician: booking.technician,
      vehicle: booking.vehicle,
      stale,
    },
  });
};

exports.updateTracking = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, company: req.company._id });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (!['Assigned', 'En Route', 'Arrived', 'In Progress'].includes(booking.status)) return res.status(409).json({ message: 'Tracking is not available for this booking stage' });
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ message: 'Valid coordinates are required' });
  booking.tracking = {
    lat,
    lng,
    destination: coordsForLocation(booking.location),
    etaMinutes: Math.max(0, Number(req.body.etaMinutes || 0)),
    vehicleLabel: String(req.body.vehicleLabel || booking.vehicle?.label || ''),
    updatedAt: new Date(),
  };
  await booking.save();
  const io = req.app.get('io');
  if (io) io.to(`booking:${booking._id}`).emit('tracking:update', { bookingId: booking._id, tracking: booking.tracking, status: booking.status });
  return res.json({ tracking: booking.tracking });
};
