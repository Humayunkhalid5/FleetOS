const Booking = require('../models/Booking');
const Technician = require('../models/Technician');
const { coordsForLocation, offsetCoords } = require('../utils/geo');

exports.assignTechnician = async (req, res) => {
  const bookingId = req.params.id || req.body.bookingId;
  const technicianId = req.body.technicianId || req.body.techId;
  const booking = await Booking.findOne({ _id: bookingId, company: req.company._id });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.status !== 'Pending') return res.status(409).json({ message: 'Only pending bookings can be assigned' });

  const technician = await Technician.findOneAndUpdate(
    { _id: technicianId, company: req.company._id, status: 'Available' },
    { status: 'On Job' },
    { new: true }
  );
  if (!technician) return res.status(409).json({ message: 'Technician is not available for this company' });

  booking.technician = technician._id;
  booking.status = 'Assigned';
  const etaMinutes = Math.min(Math.max(Number(req.body.etaMinutes || 30), 5), 240);
  const destination = coordsForLocation(booking.location);
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
  booking.statusHistory.push({ status: 'Assigned', at: new Date(), byRole: 'company', note: `Assigned to ${technician.name}` });
  await booking.save();
  return res.json({ booking: await booking.populate('technician', 'name status phone') });
};
