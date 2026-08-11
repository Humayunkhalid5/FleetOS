const Booking = require('../models/Booking');
const Company = require('../models/Company');
const User = require('../models/User');

const pickTechnician = (company, requestedName) => {
  const pool = company?.technicians || [];
  if (requestedName && pool.some((t) => t.name === requestedName)) {
    return requestedName;
  }
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
      customerName,
      customerPhone,
      customerEmail,
    } = req.body;

    if (!companyId || !service) {
      return res.status(400).json({ message: 'Please provide company and service' });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(companyId);
    let company = isObjectId
      ? await Company.findById(companyId)
      : await Company.findOne({ slug: companyId });

    if (!company) {
      const userComp = isObjectId
        ? await User.findById(companyId)
        : await User.findOne({ $or: [{ companyId }, { companyName: new RegExp(`^${companyId}$`, 'i') }] });
      
      if (userComp) {
        company = {
          _id: userComp._id,
          name: userComp.companyName || userComp.name,
          slug: userComp.companyId || (userComp.companyName || userComp.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          location: userComp.address || '',
          technicians: []
        };
      }
    }

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const serviceCost = Number(servicePrice || baseLabor || 0);
    const matTotal = Number(materialsTotal || 0);
    const subtotal = serviceCost + matTotal;
    const tax = subtotal * 0.085;
    const total = subtotal + tax;

    const assignedTechnician = pickTechnician(company, technician);
    const resolvedCompanySlug = company.slug || (company._id ? company._id.toString() : companyId);

    const booking = await Booking.create({
      user: req.user?._id,
      company: company._id,
      companyId: resolvedCompanySlug,
      companyName: company.name || 'Service Provider',
      customerName: customerName || req.user?.name || 'Valued Client',
      customerPhone: customerPhone || req.user?.phone || '',
      customerEmail: customerEmail || req.user?.email || '',
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
      status: 'Pending',
      tracking: { stage: 'assigned', etaMinutes: 12 },
    });

    const populated = await Booking.findById(booking._id).populate('company', 'name slug logo');
    return res.status(201).json({ booking: populated || booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Get logged-in user's or company's bookings
// @route  GET /api/bookings
exports.getMyBookings = async (req, res) => {
  try {
    const { companyId } = req.query;

    let query = {};
    if (companyId) {
      query = {
        $or: [
          { companyId: companyId },
          { company: companyId },
        ],
      };
    } else if (req.user) {
      if (req.user.role === 'company' && req.user.companyId) {
        query = {
          $or: [
            { companyId: req.user.companyId },
            { company: req.user._id },
          ],
        };
      } else {
        query = { user: req.user._id };
      }
    }

    let bookings = await Booking.find(query);
    if (Array.isArray(bookings)) {
      bookings = bookings.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else {
      bookings = [];
    }

    return res.json({ bookings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Get single booking
// @route  GET /api/bookings/:id
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    return res.json({ booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Update booking status/tracking/technician (called by Company or Client)
// @route  PUT /api/bookings/:id or PATCH /api/bookings/:id
exports.updateBooking = async (req, res) => {
  try {
    const { status, tracking, vehicleLabel, technician, notes } = req.body;
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (technician !== undefined) updates.technician = technician;
    if (vehicleLabel !== undefined) updates.vehicleLabel = vehicleLabel;
    if (notes !== undefined) updates.notes = notes;
    if (tracking) {
      updates.tracking = { ...(booking.tracking || {}), ...tracking };
    }

    const updated = await Booking.save({ ...booking, ...updates });
    return res.json({ booking: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
