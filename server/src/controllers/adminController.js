const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Technician = require('../models/Technician');
const SupportRequest = require('../models/SupportRequest');
const AuditEvent = require('../models/AuditEvent');
const { authenticateCredentials, issueSession, clearSession, publicUser } = require('./authController');
const { sendCompanyDecisionEmail } = require('../utils/mailer');
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

function companyClientVisible(company) {
  return company?.approvalStatus === 'approved' && (company.owner?.status || 'active') !== 'suspended';
}

function annotateCompany(company) {
  return { ...company, clientVisible: companyClientVisible(company), ownerStatus: company.owner?.status || 'unknown' };
}

async function audit(req, action, targetType, targetId, reason, metadata = {}) {
  return AuditEvent.create({ actor: req.user._id, action, targetType, targetId, reason, metadata, requestId: req.requestId });
}

function requireReason(req, res) {
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 8) {
    res.status(400).json({ message: 'An audit reason of at least 8 characters is required' });
    return null;
  }
  return reason;
}

exports.adminLogin = async (req, res) => {
  const user = await authenticateCredentials(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });
  if (user.role !== 'super-admin') return res.status(403).json({ message: 'Super Admin access required' });
  user.lastLoginAt = new Date();
  await user.save();
  issueSession(res, user, 'fleetos_admin_session');
  return res.json({ user: publicUser(user) });
};

exports.adminLogout = async (req, res) => {
  clearSession(res, 'fleetos_admin_session');
  return res.status(204).end();
};

exports.adminMe = async (req, res) => res.json({ user: publicUser(req.user) });

exports.overview = async (req, res) => {
  const [companyCounts, userCounts, bookingCounts, finance, review, activeTechnicians, pendingCompanies, openSupport, recentBookings, revenueTrend] = await Promise.all([
    Company.aggregate([{ $group: { _id: '$approvalStatus', count: { $sum: 1 } } }]),
    User.aggregate([{ $match: { role: { $ne: 'super-admin' } } }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { status: 'recorded' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Review.aggregate([{ $match: { published: true } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    Technician.countDocuments({ status: { $in: ['Available', 'On Job', 'En Route'] } }),
    Company.find({ approvalStatus: 'pending' }).sort({ createdAt: 1 }).limit(6).lean(),
    SupportRequest.countDocuments({ status: 'open' }),
    Booking.find().populate('company', 'name').sort({ createdAt: -1 }).limit(8).lean(),
    Payment.aggregate([
      { $match: { status: 'recorded' } },
      { $group: { _id: { year: { $year: '$recordedAt' }, month: { $month: '$recordedAt' } }, amount: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 7 },
    ]),
  ]);
  const sumCounts = (rows) => rows.reduce((sum, row) => sum + row.count, 0);
  return res.json({
    metrics: {
      companies: sumCounts(companyCounts),
      customers: userCounts.find((row) => row._id === 'customer')?.count || 0,
      jobs: sumCounts(bookingCounts),
      revenue: finance[0]?.total || 0,
      payments: finance[0]?.count || 0,
      averageRating: review[0]?.average || 0,
      reviews: review[0]?.count || 0,
      activeTechnicians,
      openSupport,
    },
    companyCounts,
    bookingCounts,
    pendingCompanies,
    recentBookings,
    revenueTrend,
    mongo: { state: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', database: mongoose.connection.name },
  });
};

exports.listCompanies = async (req, res) => {
  const companies = await Company.find().populate('owner', 'name email status').sort({ createdAt: -1 }).lean();
  return res.json({ companies: companies.map(annotateCompany) });
};

exports.listRequests = async (req, res) => res.json({
  companies: (await Company.find({ approvalStatus: { $in: ['pending', 'rejected'] } })
    .populate('owner', 'name email status')
    .sort({ createdAt: 1 })
    .lean()).map(annotateCompany),
});

exports.listReviews = async (req, res) => res.json({
  reviews: await Review.find()
    .populate('customer', 'name email')
    .populate('company', 'name city')
    .populate('booking', 'reference serviceSnapshot')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean(),
});

exports.getCompanyDocument = async (req, res) => {
  const company = await Company.findById(req.params.id).select('+businessLicense.data').lean();
  if (!company?.businessLicense?.data) return res.status(404).json({ message: 'Business license is not available' });
  return res.json({ document: company.businessLicense });
};

exports.setCompanyStatus = async (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;
  const status = req.body.status;
  if (!['approved', 'rejected', 'suspended'].includes(status)) return res.status(400).json({ message: 'Status must be approved, rejected or suspended' });
  const company = await Company.findOneAndUpdate(
    { _id: req.params.id, approvalVersion: Number(req.body.version) },
    { approvalStatus: status, approvedAt: status === 'approved' ? new Date() : null, $inc: { approvalVersion: 1 } },
    { new: true }
  );
  if (!company) return res.status(409).json({ message: 'Company was updated elsewhere; refresh and try again' });
  await User.updateOne(
    { company: company._id, role: 'company' },
    { status: status === 'approved' ? 'active' : 'suspended', $inc: { sessionVersion: 1 } },
  );
  await audit(req, `company.${status}`, 'Company', company._id, reason, { version: company.approvalVersion });
  const email = await sendCompanyDecisionEmail(company, status).catch((error) => ({ delivered: false, reason: error.message }));
  return res.json({ company, email });
};

exports.listUsers = async (req, res) => res.json({ users: await User.find({ role: { $ne: 'super-admin' } }).populate('company', 'name').sort({ createdAt: -1 }).lean() });

exports.setUserStatus = async (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;
  const status = req.body.status;
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ message: 'Invalid user status' });
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: { $ne: 'super-admin' } }, { status, $inc: { sessionVersion: 1 } }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  await audit(req, `user.${status}`, 'User', user._id, reason);
  return res.json({ user });
};

exports.listBookings = async (req, res) => res.json({ bookings: await Booking.find().populate('company', 'name').populate('customer', 'name email').sort({ createdAt: -1 }).limit(500).lean() });
exports.listPayments = async (req, res) => res.json({ payments: await Payment.find().populate('company', 'name').populate('customer', 'name email').populate('booking', 'reference').sort({ createdAt: -1 }).limit(500).lean() });
exports.listSupport = async (req, res) => res.json({ requests: await SupportRequest.find().populate('createdBy', 'name email role').sort({ createdAt: -1 }).lean() });
exports.listAudit = async (req, res) => res.json({ events: await AuditEvent.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(500).lean() });

exports.setSupportStatus = async (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;
  const status = req.body.status;
  if (!['open', 'resolved'].includes(status)) return res.status(400).json({ message: 'Invalid support status' });
  const request = await SupportRequest.findByIdAndUpdate(req.params.id, { status, resolution: status === 'resolved' ? reason : '' }, { new: true });
  if (!request) return res.status(404).json({ message: 'Support request not found' });
  await audit(req, `support.${status}`, 'SupportRequest', request._id, reason);
  return res.json({ request });
};

exports.updateAdminProfile = async (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;
  const admin = await User.findById(req.user._id).select('+password');
  if (!admin) return res.status(404).json({ message: 'Super Admin account not found' });

  const requestedEmail = String(req.body.email || admin.email).toLowerCase().trim();
  if (!/^\S+@\S+\.\S+$/.test(requestedEmail)) return res.status(400).json({ message: 'Enter a valid Admin email address' });
  if (requestedEmail !== admin.email && await User.exists({ email: requestedEmail, _id: { $ne: admin._id } })) {
    return res.status(409).json({ message: 'That email address is already in use' });
  }

  const wantsPasswordChange = Boolean(req.body.currentPassword || req.body.newPassword);
  if (wantsPasswordChange) {
    if (!req.body.currentPassword || !req.body.newPassword) return res.status(400).json({ message: 'Both current and new password are required' });
    if (!strongPassword.test(String(req.body.newPassword))) return res.status(400).json({ message: 'New password must be at least 10 characters and include uppercase, lowercase, number and symbol' });
    if (!(await bcrypt.compare(req.body.currentPassword, admin.password))) return res.status(400).json({ message: 'Current password is incorrect' });
    admin.password = await bcrypt.hash(req.body.newPassword, 12);
  }

  const emailChanged = requestedEmail !== admin.email;
  const identityChanged = emailChanged || wantsPasswordChange;
  admin.email = requestedEmail;
  if (identityChanged) admin.sessionVersion += 1;
  await admin.save();
  req.user = admin;
  await audit(req, 'admin.settings', 'User', admin._id, reason, { emailChanged, passwordChanged: wantsPasswordChange });
  issueSession(res, admin, 'fleetos_admin_session');
  return res.json({ user: publicUser(admin) });
};

