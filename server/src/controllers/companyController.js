const mongoose = require('mongoose');
const Company = require('../models/Company');
const Service = require('../models/Service');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Technician = require('../models/Technician');
const Inventory = require('../models/Inventory');
const Payment = require('../models/Payment');
const City = require('../models/City');
const { getWorkspace, hasBusinessCategory, categoryOf, publicCategories } = require('../config/companyWorkspace');
const { FULFILLMENT, FULFILLMENT_TYPES } = require('../config/fulfillment');
const { pick } = require('../utils/http');
const { monthlyTotals } = require('../utils/months');
const { broadcastMarketplace } = require('../socket');

function isClientVisible(company, owner = null) {
  const ownerStatus = owner?.status || company.ownerStatus || 'active';
  return company.approvalStatus === 'approved' && company.clientListed !== false && ownerStatus !== 'suspended';
}

function publicCompany(company, services = [], owner = null) {
  const data = company.toJSON ? company.toJSON() : { ...company };
  delete data.owner;
  delete data.approvalVersion;
  delete data.businessLicense;
  return { ...data, workspace: getWorkspace(data), verified: data.approvalStatus === 'approved', ownerStatus: owner?.status || data.ownerStatus || 'active', clientVisible: isClientVisible(data, owner), services };
}

// The Pakistan city catalogue changes only when the seed changes, so the
// marketplace list reuses one copy instead of querying it on every request.
let cityCache = { rows: null, at: 0 };
async function cityCatalogue() {
  if (cityCache.rows && Date.now() - cityCache.at < 10 * 60_000) return cityCache.rows;
  const rows = await City.find({}, 'name province').sort({ name: 1 }).lean();
  cityCache = { rows, at: Date.now() };
  return rows;
}

const LISTING_SERVICE_FIELDS = 'company name category price durationMinutes status kind unit';

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.getCompanies = async (req, res) => {
  const query = { approvalStatus: 'approved' };
  const search = String(req.query.search || req.query.q || '').trim();
  const area = String(req.query.area || '').trim();
  const category = String(req.query.category || '').trim();
  const industry = String(req.query.industry || '').trim();
  const fulfillment = String(req.query.fulfillment || '').trim();
  if (industry && hasBusinessCategory(industry)) query.businessCategory = industry;
  if (fulfillment && FULFILLMENT_TYPES.includes(fulfillment)) {
    // Explicit choice, or (when the company left it empty) its category's defaults.
    const categories = publicCategories().filter((entry) => entry.fulfillment.includes(fulfillment)).map((entry) => entry.value);
    query.$and = [...(query.$and || []), { $or: [{ fulfillmentOptions: fulfillment }, { fulfillmentOptions: { $size: 0 }, businessCategory: { $in: categories } }, { fulfillmentOptions: { $exists: false }, businessCategory: { $in: categories } }] }];
  }
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 120), 1), 500);
  const skip = (page - 1) * limit;

  if (req.query.city) query.city = new RegExp(`^${escapeRegex(req.query.city)}$`, 'i');
  if (area) query.$or = [
    { location: new RegExp(escapeRegex(area), 'i') },
    { areas: new RegExp(escapeRegex(area), 'i') },
  ];
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');
    const searchConditions = [
      { name: searchRegex },
      { description: searchRegex },
      { location: searchRegex },
      { city: searchRegex },
      { areas: searchRegex },
    ];
    query.$and = [...(query.$and || []), { $or: searchConditions }];
  }

  if (category) {
    // Only return companies with a currently active service in the selected
    // category.  The escaped, anchored match keeps category filters reliable
    // even when a company has similarly named offers.
    const categoryRegex = new RegExp(`^${escapeRegex(category)}$`, 'i');
    const matchingServices = await Service.distinct('company', {
      status: 'Active',
      category: categoryRegex,
    });
    query._id = { $in: matchingServices };
  }

  const [rawCompanies, total, cityRows] = await Promise.all([
    Company.find(query).select({ gallery: { $slice: 1 } }).sort({ rating: -1, updatedAt: -1, name: 1 }).skip(skip).limit(limit).lean(),
    Company.countDocuments(query),
    cityCatalogue(),
  ]);
  const ownerRows = await User.find({ company: { $in: rawCompanies.map((company) => company._id) }, role: 'company' }, 'company status').lean();
  const ownerByCompany = ownerRows.reduce((map, owner) => ({ ...map, [String(owner.company)]: owner }), {});
  const companies = rawCompanies.filter((company) => isClientVisible(company, ownerByCompany[String(company._id)]));
  const ids = companies.map((company) => company._id);
  const services = await Service.find({ company: { $in: ids }, status: 'Active' }, LISTING_SERVICE_FIELDS).lean();
  const byCompany = services.reduce((map, service) => {
    const key = String(service.company);
    if (!map[key]) map[key] = [];
    map[key].push(service);
    return map;
  }, {});
  const areasByCity = companies.reduce((result, company) => {
    if (!result[company.city]) result[company.city] = [];
    for (const area of company.areas || []) {
      if (!result[company.city].includes(area)) result[company.city].push(area);
    }
    return result;
  }, {});
  return res.json({
    companies: companies.map((company) => publicCompany(company, byCompany[String(company._id)] || [], ownerByCompany[String(company._id)])),
    cities: cityRows.map((city) => city.name),
    cityCatalogue: cityRows,
    areasByCity,
    page,
    limit,
    total,
    hasMore: skip + rawCompanies.length < total,
  });
};

exports.getCities = async (req, res) => {
  const cities = await City.find({ country: 'Pakistan' }, 'name province').sort({ name: 1 }).lean();
  return res.json({ cities, businessCategories: publicCategories(), fulfillment: FULFILLMENT });
};

exports.getBusinessCategories = async (req, res) => {
  const counts = await Company.aggregate([{ $match: { approvalStatus: 'approved', clientListed: { $ne: false } } }, { $group: { _id: '$businessCategory', count: { $sum: 1 } } }]);
  const byCategory = Object.fromEntries(counts.map((row) => [row._id, row.count]));
  res.set('Cache-Control', 'public, max-age=60');
  return res.json({ businessCategories: publicCategories().map((entry) => ({ ...entry, companies: byCategory[entry.value] || 0 })), fulfillment: FULFILLMENT });
};

exports.getCompany = async (req, res) => {
  const identifier = req.params.id;
  const filter = mongoose.isValidObjectId(identifier) ? { _id: identifier } : { slug: identifier };
  const company = await Company.findOne({ ...filter, approvalStatus: 'approved' }).lean();
  if (!company) return res.status(404).json({ message: 'Company not found' });
  const owner = await User.findOne({ company: company._id, role: 'company' }, 'status').lean();
  if (!isClientVisible(company, owner)) return res.status(404).json({ message: 'Company not found' });
  const [services, technicians] = await Promise.all([
    Service.find({ company: company._id, status: 'Active' }).lean(),
    Technician.find({ company: company._id }).select('name role rating avatar experienceYears status').sort({ name: 1 }).lean(),
  ]);
  return res.json({ company: { ...publicCompany(company, services, owner), technicians } });
};

exports.getCompanyDashboard = async (req, res) => {
  const company = req.company;
  const [bookings, technicians, inventory, payments, statusCounts] = await Promise.all([
    Booking.find({ company: company._id }).populate('technician', 'name status').sort({ createdAt: -1 }).limit(50).lean(),
    Technician.find({ company: company._id }).sort({ name: 1 }).lean(),
    Inventory.find({ company: company._id }).sort({ quantity: 1 }).lean(),
    Payment.find({ company: company._id, status: 'recorded' }).sort({ recordedAt: 1 }).lean(),
    // Metrics count every booking, not only the 50 most recent returned below.
    // Chat-only inquiries are conversations, not jobs, so they stay out of metrics.
    Booking.aggregate([{ $match: { company: company._id, 'serviceSnapshot.category': { $ne: 'Inquiry' } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const countOf = (...statuses) => statusCounts.filter((row) => statuses.includes(row._id)).reduce((sum, row) => sum + row.count, 0);
  const activeStatuses = ['Assigned', 'En Route', 'Arrived', 'In Progress'];
  const monthLabel = new Intl.DateTimeFormat('en', { month: 'short', year: '2-digit' });
  const revenueByMonth = monthlyTotals(payments, { dateOf: (payment) => payment.recordedAt || payment.createdAt, amountOf: (payment) => payment.amount })
    .map(({ year, month, amount }) => ({ month: monthLabel.format(new Date(year, month - 1, 1)), amount }));
  return res.json({
    company: publicCompany(company),
    metrics: {
      totalBookings: statusCounts.reduce((sum, row) => sum + row.count, 0),
      completedJobs: countOf('Completed', 'Paid'),
      activeJobs: countOf(...activeStatuses),
      pendingDispatch: countOf('Pending'),
      statusCounts: Object.fromEntries(statusCounts.map((row) => [row._id, row.count])),
      availableTechnicians: technicians.filter((tech) => tech.status === 'Available').length,
      technicianTotal: technicians.length,
      lowStock: inventory.filter((item) => item.quantity <= item.reorderLevel).length,
      recordedRevenue: payments.reduce((sum, payment) => sum + payment.amount, 0),
    },
    bookings,
    technicians,
    lowStock: inventory.filter((item) => item.quantity <= item.reorderLevel).slice(0, 8),
    revenue: revenueByMonth,
  });
};

exports.updateCompanySettings = async (req, res) => {
  const updates = pick(req.body, ['name', 'description', 'phone', 'location', 'city', 'province', 'areas', 'businessCategory']);
  if (updates.businessCategory && !hasBusinessCategory(updates.businessCategory)) return res.status(400).json({ message: 'Invalid business category' });
  if (req.body.fulfillmentOptions !== undefined) {
    const allowed = categoryOf(updates.businessCategory || req.company.businessCategory).fulfillment;
    const chosen = [...new Set((Array.isArray(req.body.fulfillmentOptions) ? req.body.fulfillmentOptions : []).map(String))];
    const invalid = chosen.filter((type) => !allowed.includes(type));
    if (invalid.length) return res.status(400).json({ message: `This business type can offer: ${allowed.map((type) => FULFILLMENT[type].label).join(', ')}` });
    if (!chosen.length) return res.status(400).json({ message: 'Choose at least one way customers can receive your service' });
    updates.fulfillmentOptions = chosen;
  } else if (updates.businessCategory && updates.businessCategory !== req.company.businessCategory) {
    updates.fulfillmentOptions = []; // a new category starts from its own defaults
  }
  if (req.body.deliveryFee !== undefined) {
    const fee = Number(req.body.deliveryFee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100000) return res.status(400).json({ message: 'Delivery fee must be between PKR 0 and 100,000' });
    updates.deliveryFee = Math.round(fee);
  }
  if (updates.city) {
    const selectedCity = await City.findOne({ name: new RegExp(`^${String(updates.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), country: 'Pakistan' }).lean();
    if (!selectedCity) return res.status(400).json({ message: 'Choose a valid Pakistani city from the list' });
    updates.city = selectedCity.name;
    updates.province = selectedCity.province;
  }
  if (req.body.logo && req.body.logo !== req.company.logo) {
    const { validateLogo } = require('../utils/uploads');
    updates.logo = validateLogo(req.body.logo).data;
  }
  if (req.body.heroImage && req.body.heroImage !== req.company.heroImage) {
    const { validateLogo } = require('../utils/uploads');
    updates.heroImage = validateLogo(req.body.heroImage).data;
  }
  Object.assign(req.company, updates);
  await req.company.save();
  broadcastMarketplace('company', req.company._id);
  return res.json({ company: publicCompany(req.company) });
};

