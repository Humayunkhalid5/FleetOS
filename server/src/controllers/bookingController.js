const crypto = require('crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Company = require('../models/Company');
const Service = require('../models/Service');
const Technician = require('../models/Technician');
const Customer = require('../models/Customer');
const { generateInvoiceForBooking } = require('./invoiceController');
const { createNotification } = require('./notificationController');
const { broadcastBooking } = require('../socket');
const { fulfillmentOf, nextStatusFor } = require('../config/fulfillment');
const { fulfillmentOptionsFor, getWorkspace } = require('../config/companyWorkspace');

// Default (on-site) order, kept for callers that do not know the booking's fulfilment.
const nextStatus = {
  Pending: 'Assigned',
  Assigned: 'En Route',
  'En Route': 'Arrived',
  Arrived: 'In Progress',
  'In Progress': 'Completed',
  Completed: 'Paid',
};
const fulfillmentTypeOf = (booking) => booking?.fulfillment?.type || 'onsite';

function normalizeStatus(value) {
  const input = String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  return Booking.lifecycle.find((status) => status.toLowerCase() === input) || null;
}

function accessFilter(req) {
  if (req.user.role === 'customer') return { customer: req.user._id };
  if (req.user.role === 'company') return { company: req.user.company?._id || req.user.company };
  return {};
}

function parseScheduledAt(body) {
  if (body.scheduledAt) return new Date(body.scheduledAt);
  const date = body.scheduledDate || new Date().toISOString().slice(0, 10);
  const time = body.scheduledTime || '09:00';
  return new Date(`${date}T${time}:00`);
}

function bookingLocation(req, company, fulfillment) {
  // Pickup, in-store and remote jobs happen at (or from) the business itself.
  if (!fulfillmentOf(fulfillment).needsAddress) return company.location ? `${company.name} · ${company.location}` : company.name;
  const value = req.body.location;
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') return [value.address, value.area, value.city].filter(Boolean).join(', ');
  return req.user.address || company.location;
}

async function resolveCompany(identifier) {
  if (!identifier) return null;
  const filter = mongoose.isValidObjectId(identifier) ? { _id: identifier } : { slug: identifier };
  return Company.findOne({ ...filter, approvalStatus: 'approved' });
}

exports.createBooking = async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey || null;
  if (idempotencyKey && req.user.role === 'customer') {
    const existing = await Booking.findOne({ customer: req.user._id, idempotencyKey });
    if (existing) return res.status(200).json({ booking: existing, idempotentReplay: true });
  }

  const company = req.user.role === 'company'
    ? await Company.findById(req.user.company?._id || req.user.company)
    : await resolveCompany(req.body.companyId || req.body.company);
  if (!company || company.approvalStatus !== 'approved') return res.status(404).json({ message: 'Approved company not found' });

  let service = null;
  if (req.body.serviceId && mongoose.isValidObjectId(req.body.serviceId)) {
    service = await Service.findOne({ _id: req.body.serviceId, company: company._id, status: 'Active' });
  }
  if (!service && (req.body.serviceName || req.body.service)) {
    const serviceName = typeof req.body.service === 'object' ? req.body.service.name : req.body.serviceName || req.body.service;
    service = await Service.findOne({ company: company._id, name: serviceName, status: 'Active' });
  }
  if (!service) return res.status(400).json({ message: 'Choose an active service from this company' });

  const offered = fulfillmentOptionsFor(company);
  const fulfillment = req.body.fulfillment?.type || req.body.fulfillment || offered[0];
  if (typeof fulfillment !== 'string' || !offered.includes(fulfillment)) return res.status(400).json({ message: `${company.name} offers: ${offered.map((type) => fulfillmentOf(type).label).join(', ')}` });
  if (fulfillmentOf(fulfillment).needsAddress && req.user.role === 'customer' && !String(req.body.location?.address || req.body.location || req.user.address || '').trim()) {
    return res.status(400).json({ message: fulfillment === 'delivery' ? 'Add the delivery address' : 'Add the address where the work should happen' });
  }
  const quantity = service.kind === 'product' ? Math.min(Math.max(Math.round(Number(req.body.quantity || 1)), 1), 999) : 1;
  const fee = fulfillment === 'delivery' ? Number(company.deliveryFee || 0) : 0;

  const scheduledAt = parseScheduledAt(req.body);
  if (Number.isNaN(scheduledAt.getTime())) return res.status(400).json({ message: 'A valid booking date and time is required' });
  if (req.user.role === 'customer' && scheduledAt.getTime() < Date.now() - 15 * 60 * 1000) return res.status(400).json({ message: 'Choose a time in the future for this booking' });
  const materials = Array.isArray(req.body.materials) ? req.body.materials.map((item) => ({
    name: String(item.name || '').slice(0, 120),
    quantity: Math.max(Number(item.quantity || 1), 1),
    unitPrice: Math.max(Number(item.unitPrice || 0), 0),
  })) : [];
  const materialsTotal = materials.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const serviceTotal = service.price * quantity;
  const tax = Math.round((serviceTotal + materialsTotal) * 0.085);
  const customerName = req.user.role === 'customer' ? req.user.name : req.body.customerName;
  const customerEmail = req.user.role === 'customer' ? req.user.email : req.body.customerEmail;
  if (!customerName) return res.status(400).json({ message: 'Customer name is required' });

  const booking = await Booking.create({
    reference: `FOS-${new Date().getFullYear()}-${crypto.randomInt(100000, 999999)}`,
    customer: req.user.role === 'customer' ? req.user._id : null,
    company: company._id,
    service: service._id,
    serviceSnapshot: { name: service.name, category: service.category, price: service.price, kind: service.kind || 'service', unit: service.unit || '' },
    quantity,
    fulfillment: { type: fulfillment, fee },
    customerName,
    customerEmail: customerEmail || '',
    customerPhone: req.user.role === 'customer' ? req.user.phone : req.body.customerPhone || '',
    vehicle: req.body.vehicle || { label: req.body.vehicleLabel || '' },
    materials,
    pricing: { serviceTotal, materialsTotal, fee, tax, finalTotal: serviceTotal + materialsTotal + fee + tax },
    scheduledAt,
    location: bookingLocation(req, company, fulfillment),
    paymentMethod: ['cash', 'card'].includes(req.body.paymentMethod) ? req.body.paymentMethod : 'cash',
    paymentStatus: req.body.paymentMethod === 'card' ? 'pending' : 'unpaid',
    notes: String(req.body.notes || req.body.problemDetails || '').trim().slice(0, 2000),
    ...(fulfillmentOf(fulfillment).needsAddress && Number.isFinite(Number(req.body.coordinates?.lat)) && Number.isFinite(Number(req.body.coordinates?.lng))
      ? { tracking: { destination: { lat: Number(req.body.coordinates.lat), lng: Number(req.body.coordinates.lng), label: bookingLocation(req, company, fulfillment) } } }
      : {}),
    ...(idempotencyKey ? { idempotencyKey } : {}),
    statusHistory: [{ status: 'Pending', at: new Date(), byRole: req.user.role }],
  });

  await Customer.findOneAndUpdate(
    { company: company._id, email: String(customerEmail || '').toLowerCase() },
    { $set: { name: customerName, phone: req.body.customerPhone || req.user.phone || '' }, $setOnInsert: { customerId: `CUST-${crypto.randomInt(100000, 999999)}` } },
    { upsert: Boolean(customerEmail), new: true, setDefaultsOnInsert: true }
  );
  const populatedBooking = await booking.populate(['company', 'service']);
  const io = req.app.get('io');

  // Emit Notification to Company
  await createNotification({
    recipientCompany: company._id,
    title: fulfillment === 'delivery' || fulfillment === 'pickup' ? 'New order' : 'New request',
    message: `${booking.reference} from ${customerName}: ${quantity > 1 ? `${quantity} × ` : ''}${service.name} (${fulfillmentOf(fulfillment).label.toLowerCase()}).`,
    type: 'booking',
    referenceId: booking.reference,
    link: '/company/bookings',
    io,
  });

  broadcastBooking(populatedBooking, 'booking:created');
  return res.status(201).json({ booking: populatedBooking });
};

exports.getMyBookings = async (req, res) => {
  const bookings = await Booking.find(accessFilter(req))
    .populate('company', 'name slug logo city phone')
    .populate('technician', 'name phone status avatar skills rating')
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ bookings });
};

exports.getBooking = async (req, res) => {
  const lookup = mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : { reference: req.params.id };
  const booking = await Booking.findOne({ ...lookup, ...accessFilter(req) })
    .populate('company', 'name slug logo city phone')
    .populate('technician', 'name phone status avatar currentLocation skills rating')
    .lean();
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  return res.json({ booking });
};

exports.updateBooking = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, ...accessFilter(req) });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  const requestedStatus = normalizeStatus(req.body.status);

  if (req.user.role === 'customer') {
    if (requestedStatus !== 'Cancelled' || !['Pending', 'Assigned'].includes(booking.status)) return res.status(409).json({ message: 'Customers can only cancel pending or assigned bookings' });
    booking.status = 'Cancelled';
    booking.cancellationReason = String(req.body.reason || 'Cancelled by customer').slice(0, 500);
  } else {
    if (requestedStatus === 'Cancelled') {
      if (['Paid', 'Cancelled'].includes(booking.status)) return res.status(409).json({ message: 'This booking is already terminal' });
      if (!String(req.body.reason || '').trim()) return res.status(400).json({ message: 'A cancellation reason is required' });
      booking.status = 'Cancelled';
      booking.cancellationReason = String(req.body.reason).slice(0, 500);
    } else if (requestedStatus) {
      const type = fulfillmentTypeOf(booking);
      const expected = nextStatusFor(type, booking.status);
      if (expected !== requestedStatus) return res.status(409).json({ message: `The next valid status is ${expected || 'none'}` });
      if (requestedStatus === 'Paid') return res.status(409).json({ message: 'Record the payment to mark this booking paid' });
      // Only on-site visits need a named staff member before they can start,
      // and only when the business manages staff in FleetOS at all.
      const company = await Company.findById(booking.company).select('businessCategory fulfillmentOptions').lean();
      if (requestedStatus === 'Assigned' && fulfillmentOf(type).requiresStaff && getWorkspace(company).modules.workforce && !booking.technician) {
        return res.status(409).json({ message: 'Assign an available staff member first' });
      }
      booking.status = requestedStatus;
    }
  }

  if (requestedStatus) booking.statusHistory.push({ status: booking.status, at: new Date(), byRole: req.user.role, note: req.body.note || '' });
  if (['Completed', 'Cancelled'].includes(booking.status) && booking.technician) {
    await Technician.updateOne({ _id: booking.technician, company: booking.company }, { status: 'Available', $inc: { completedJobsCount: booking.status === 'Completed' ? 1 : 0 } });
  }

  // Auto-generate Invoice if Completed or Paid
  if (['Completed', 'Paid'].includes(booking.status)) {
    await generateInvoiceForBooking(booking._id).catch((err) => console.error('Auto invoice failed:', err.message));
  }

  await booking.save();
  const populatedBooking = await booking.populate('technician', 'name status');
  const io = req.app.get('io');

  // Notify customer of status change
  if (booking.customer) {
    await createNotification({
      recipientUser: booking.customer,
      title: `Booking ${booking.reference} Updated`,
      message: `${booking.serviceSnapshot?.name || 'Your booking'}: ${fulfillmentOf(fulfillmentTypeOf(booking)).labels[booking.status] || booking.status}.`,
      type: 'status_change',
      referenceId: booking.reference,
      link: '/customer/bookings',
      io,
    });
  }

  broadcastBooking(populatedBooking, 'booking:updated');
  return res.json({ booking: populatedBooking });
};

exports.nextStatus = nextStatus;
exports.normalizeStatus = normalizeStatus;
exports.accessFilter = accessFilter;
