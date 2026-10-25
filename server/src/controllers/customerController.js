const crypto = require('crypto');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const { pick } = require('../utils/http');

// Job counts and spend are derived from real bookings so the directory is
// always accurate (the stored totals are only used for imported records).
exports.getCustomers = async (req, res) => {
  const [customers, stats] = await Promise.all([
    Customer.find({ company: req.company._id }).sort({ updatedAt: -1 }).lean(),
    Booking.aggregate([
      { $match: { company: req.company._id, 'serviceSnapshot.category': { $ne: 'Inquiry' } } },
      { $group: {
        _id: { $toLower: '$customerEmail' },
        bookings: { $sum: 1 },
        completed: { $sum: { $cond: [{ $in: ['$status', ['Completed', 'Paid']] }, 1, 0] } },
        spent: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$pricing.finalTotal', 0] } },
        lastBookingAt: { $max: '$createdAt' },
      } },
    ]),
  ]);
  const byEmail = new Map(stats.map((row) => [row._id, row]));
  return res.json({
    customers: customers.map((customer) => {
      const row = byEmail.get(String(customer.email || '').toLowerCase());
      return row
        ? { ...customer, totalBookings: row.bookings, totalJobs: row.completed, totalSpent: row.spent, lastBookingAt: row.lastBookingAt }
        : { ...customer, totalBookings: customer.totalJobs || 0 };
    }),
  });
};

exports.createCustomer = async (req, res) => {
  const data = pick(req.body, ['name', 'email', 'phone', 'address', 'status']);
  const customer = await Customer.create({ ...data, company: req.company._id, customerId: `CUST-${crypto.randomInt(100000, 999999)}` });
  return res.status(201).json({ customer });
};

exports.updateCustomer = async (req, res) => {
  const updates = pick(req.body, ['name', 'email', 'phone', 'address', 'status']);
  const customer = await Customer.findOneAndUpdate({ _id: req.params.id, company: req.company._id }, updates, { new: true, runValidators: true });
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  return res.json({ customer });
};

exports.deleteCustomer = async (req, res) => {
  const customer = await Customer.findOneAndDelete({ _id: req.params.id, company: req.company._id });
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  return res.status(204).end();
};
