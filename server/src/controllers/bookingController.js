const Booking = require('../models/Booking');
const Company = require('../models/Company');

// Helper: pick the best available technician for a company
// The company (not the customer) decides who is dispatched.
const pickTechnician = (company, requestedName) => {
  const pool = company?.technicians || [];

  // If the customer requested a specific technician that belongs to this
  // company, honour it. Otherwise the company auto-assigns the best fit.
  if (requestedName && pool.some((t) => t.name === requestedName)) {
    return requestedName;
  }

  // Prioritise technicians available today, then highest rating.
  const sorted = pool.slice().sort((a, b) => {
    if (Boolean(a.availableToday) !== Boolean(b.availableToday)) {
      return Boolean(b.availableToday) ? 1 : -1;
    }
    return (b.rating || 0) - (a.rating || 0);
  });

  return sorted[0]?.name || pool[0]?.name || 'Company will assign';
};

// @desc   Create a booking
// @route  POST /api/bookings
exports.createBooking = async (req, res) => {
  try {
    const {
      companyId,
      technician,
      service,
      servicePrice,
      baseLabor,
      materials,
      materialsTotal,
      scheduledDate,
      scheduledTime,
      location,
      paymentMethod,
      origin,
      destination,
      currentPosition,
      vehicleLabel,
    } = req.body;

    if (!companyId || !service) {
      return res.status(400).json({ message: 'Please provide company and service' });
    }

    // Support both ObjectId and slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(companyId);
    const company = isObjectId
      ? await Company.findById(companyId)
      : await Company.findOne({ slug: companyId });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const serviceCost = Number(servicePrice || baseLabor || 0);
    const matTotal = Number(materialsTotal || 0);
    const subtotal = serviceCost + matTotal;
    const tax = subtotal * 0.085;
    const total = subtotal + tax;

    // The company allots a technician — never the customer.
    const assignedTechnician = pickTechnician(company, technician);

    const booking = await Booking.create({
      user: req.user._id,
      company: company._id,
      technician: assignedTechnician,
      service,
      servicePrice: serviceCost,
      materials: materials || [],
      materialsTotal: matTotal,
      subtotal,
      tax,
      total,
      scheduledDate: scheduledDate || '',
      scheduledTime: scheduledTime || '',
      location: location || company.location || '',
      paymentMethod: paymentMethod || 'card',
      origin: origin || {
        lat: 37.7749,
        lng: -122.4194,
        label: 'FleetOS Dispatch Center',
      },
      destination: destination || {
        lat: 37.7894,
        lng: -122.3946,
        label: location || 'Service Location',
      },
      currentPosition: currentPosition || {
        lat: (origin && origin.lat) || 37.7749,
        lng: (origin && origin.lng) || -122.4194,
        updatedAt: new Date(),
      },
      vehicleLabel: vehicleLabel || 'Fleet Van #012',
      status: 'in-progress',
      tracking: { stage: 'assigned', etaMinutes: 12 },
    });

    const populated = await Booking.findById(booking._id).populate('company', 'name slug logo');
    return res.status(201).json({ booking: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Get logged-in user's bookings
// @route  GET /api/bookings
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('company', 'name slug logo')
      .sort({ createdAt: -1 });
    return res.json({ bookings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Get single booking
// @route  GET /api/bookings/:id
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id }).populate('company', 'name slug logo');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    return res.json({ booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Update booking status/tracking
// @route  PATCH /api/bookings/:id
exports.updateBooking = async (req, res) => {
  try {
    const { status, tracking, vehicleLabel } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (status) booking.status = status;
    if (vehicleLabel) booking.vehicleLabel = vehicleLabel;
    if (tracking) {
      booking.tracking = { ...booking.tracking, ...tracking };
    }

    await booking.save();
    return res.json({ booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

