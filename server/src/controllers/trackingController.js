const Booking = require('../models/Booking');
const { updateBookingPosition } = require('../services/trackingService');

// @desc   Get live tracking data for a booking
// @route  GET /api/bookings/:id/tracking
exports.getTracking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id }).populate(
      'company',
      'name slug logo'
    );
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    return res.json({
      booking: {
        _id: booking._id,
        reference: booking.reference,
        service: booking.service,
        technician: booking.technician,
        vehicleLabel: booking.vehicleLabel,
        status: booking.status,
        tracking: booking.tracking,
        origin: booking.origin,
        destination: booking.destination,
        currentPosition: booking.currentPosition,
        company: booking.company,
        location: booking.location,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Update live tracking data (used by simulator / dispatcher)
// @route  PATCH /api/bookings/:id/tracking
exports.updateTracking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const { lat, lng, stage, etaMinutes, status, vehicleLabel } = req.body;
    if (lat !== undefined || lng !== undefined) {
      await updateBookingPosition(booking, { lat, lng, stage, etaMinutes });
    } else {
      if (stage) booking.tracking.stage = stage;
      if (etaMinutes !== undefined) booking.tracking.etaMinutes = Number(etaMinutes);
      if (status) booking.status = status;
      if (vehicleLabel) booking.vehicleLabel = vehicleLabel;
      await booking.save();
    }

    return res.json({
      booking: {
        _id: booking._id,
        status: booking.status,
        tracking: booking.tracking,
        currentPosition: booking.currentPosition,
        vehicleLabel: booking.vehicleLabel,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

