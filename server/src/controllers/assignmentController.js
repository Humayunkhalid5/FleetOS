const Booking = require('../models/Booking');
const Technician = require('../models/Technician');
const { coordsForLocation, offsetCoords } = require('../utils/geo');
const { rankTechniciansForBooking } = require('../services/dispatchEngine');
const { broadcastBooking } = require('../socket');
const { fulfillmentOf } = require('../config/fulfillment');

exports.getRecommendations = async (req, res) => {
  const bookingId = req.params.id;
  const recommendations = await rankTechniciansForBooking(bookingId, req.company._id);
  return res.json({ recommendations });
};

exports.assignTechnician = async (req, res) => {
  const bookingId = req.params.id || req.body.bookingId;
  const technicianId = req.body.technicianId || req.body.techId;
  const booking = await Booking.findOne({ _id: bookingId, company: req.company._id });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (!['Pending', 'Assigned'].includes(booking.status)) {
    return res.status(409).json({ message: 'Only pending or assigned bookings can be assigned' });
  }

  const technician = await Technician.findOne({ _id: technicianId, company: req.company._id });
  if (!technician) return res.status(404).json({ message: 'Technician not found for this company' });
  if (technician.status === 'Off Duty') {
    return res.status(409).json({ message: 'Selected technician is Off Duty' });
  }

  // Update old technician status if reassigned
  if (booking.technician && String(booking.technician) !== String(technician._id)) {
    await Technician.updateOne({ _id: booking.technician, company: req.company._id }, { status: 'Available' });
  }

  technician.status = 'On Job';
  await technician.save();

  booking.technician = technician._id;
  booking.status = 'Assigned';
  if (!fulfillmentOf(booking.fulfillment?.type).tracking) {
    booking.statusHistory.push({ status: 'Assigned', at: new Date(), byRole: 'company', note: `${technician.name} will handle this` });
    await booking.save();
    const populated = await booking.populate('technician', 'name status phone avatar rating skills');
    broadcastBooking(populated, 'booking:updated');
    return res.json({ booking: populated });
  }
  const etaMinutes = Math.min(Math.max(Number(req.body.etaMinutes || 30), 5), 240);
  const saved = booking.tracking?.destination;
  const destination = Number.isFinite(Number(saved?.lat)) && Number.isFinite(Number(saved?.lng))
    ? { lat: Number(saved.lat), lng: Number(saved.lng), label: saved.label || booking.location }
    : coordsForLocation(booking.location);
  const dispatchPoint = offsetCoords(destination, 0.035, -0.035, 'Technician dispatch point');
  booking.tracking = {
    ...(booking.tracking?.toObject ? booking.tracking.toObject() : booking.tracking),
    lat: booking.tracking?.lat || dispatchPoint.lat,
    lng: booking.tracking?.lng || dispatchPoint.lng,
    destination,
    etaMinutes,
    vehicleLabel: req.body.vehicleLabel || booking.tracking?.vehicleLabel || 'FleetOS Service Vehicle',
    updatedAt: new Date(),
  };
  const note = req.body.explanation || `Smart Dispatched to ${technician.name}`;
  booking.statusHistory.push({ status: 'Assigned', at: new Date(), byRole: 'company', note });
  await booking.save();

  const populatedBooking = await booking.populate('technician', 'name status phone avatar rating skills');
  broadcastBooking(populatedBooking, 'booking:updated');
  return res.json({ booking: populatedBooking });
};
