const Company = require('../models/Company');
const Booking = require('../models/Booking');

exports.assignTechnician = async (req, res) => {
  try {
    const { bookingId, technicianName } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const company = await Company.findById(booking.company);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const technician = (company.technicians || []).find((item) => item.name === technicianName);
    if (!technician) return res.status(400).json({ message: 'Technician not found for this company' });

    booking.technician = technician.name;
    booking.status = 'assigned';
    booking.tracking = { stage: 'assigned', etaMinutes: 12 };
    const saved = await Booking.save(booking);

    return res.json({ booking: saved });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
