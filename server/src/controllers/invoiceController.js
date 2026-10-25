const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');

async function generateInvoiceForBooking(bookingId) {
  const booking = await Booking.findById(bookingId).populate('company', 'name logo city phone email');
  if (!booking) throw new Error('Booking not found');

  const existing = await Invoice.findOne({ booking: booking._id });
  if (existing) return existing;

  const laborFee = booking.pricing?.serviceTotal || booking.serviceSnapshot?.price || 0;
  const materialsCost = booking.pricing?.materialsTotal || 0;
  // Only the delivery fee the customer saw when ordering; never a surprise add-on.
  const travelFee = booking.pricing?.fee || 0;
  const subtotal = laborFee + materialsCost + travelFee;
  const taxAmount = booking.pricing?.tax || Math.round(subtotal * 0.085);
  const discountAmount = 0;
  const netTotal = subtotal + taxAmount - discountAmount;

  const invoice = await Invoice.create({
    invoiceNumber: `INV-${new Date().getFullYear()}-${crypto.randomInt(100000, 999999)}`,
    booking: booking._id,
    company: booking.company._id || booking.company,
    customer: booking.customer,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail || '',
    customerPhone: booking.customerPhone || '',
    serviceName: `${(booking.quantity || 1) > 1 ? `${booking.quantity} × ` : ''}${booking.serviceSnapshot?.name || 'Service'}`,
    laborFee,
    materialsCost,
    travelFee,
    subtotal,
    taxAmount,
    discountAmount,
    netTotal,
    // Completed work is invoiced as unpaid until the company records payment.
    paymentStatus: booking.status === 'Paid' || booking.paymentStatus === 'paid' ? 'paid' : 'unpaid',
    paymentMethod: booking.paymentMethod || 'cash',
    issuedAt: new Date(),
  });

  return invoice;
}

exports.getInvoiceByBooking = async (req, res) => {
  const { bookingId } = req.params;
  const filter = { booking: bookingId };
  if (req.user.role === 'company') filter.company = req.company._id;
  if (req.user.role === 'customer') filter.customer = req.user._id;

  let invoice = await Invoice.findOne(filter)
    .populate('company', 'name logo city phone email location')
    .populate('booking', 'reference status scheduledAt location vehicle serviceSnapshot');

  if (!invoice) {
    // Attempt auto-generation if booking belongs to user
    const accessFilter = req.user.role === 'company'
      ? { _id: bookingId, company: req.company._id }
      : { _id: bookingId, customer: req.user._id };

    const booking = await Booking.findOne(accessFilter);
    if (!booking) return res.status(404).json({ message: 'Invoice not found' });
    invoice = await generateInvoiceForBooking(booking._id);
    invoice = await Invoice.findById(invoice._id)
      .populate('company', 'name logo city phone email location')
      .populate('booking', 'reference status scheduledAt location vehicle serviceSnapshot');
  }

  return res.json({ invoice });
};

exports.getMyInvoices = async (req, res) => {
  const filter = req.user.role === 'company'
    ? { company: req.company._id }
    : { customer: req.user._id };

  const invoices = await Invoice.find(filter)
    .populate('company', 'name logo city')
    .populate('booking', 'reference status scheduledAt')
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ invoices });
};

exports.generateInvoiceForBooking = generateInvoiceForBooking;
