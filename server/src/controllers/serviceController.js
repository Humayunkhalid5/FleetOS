const crypto = require('crypto');
const mongoose = require('mongoose');
const Service = require('../models/Service');
const Company = require('../models/Company');
const { pick } = require('../utils/http');
const { broadcastMarketplace } = require('../socket');
const { categoryOf } = require('../config/companyWorkspace');

const FIELDS = ['name', 'category', 'price', 'durationMinutes', 'status', 'description', 'kind', 'unit'];
const starterRow = ([name, category, price, durationMinutes, kind, unit, description]) => ({ name, category, price, durationMinutes, kind, unit, description });

exports.getServices = async (req, res) => {
  if (req.user?.role === 'company' && req.user.company?.approvalStatus !== 'approved') {
    return res.status(403).json({ message: 'Company approval is required before accessing operations' });
  }
  let companyId = req.user?.role === 'company' ? req.user.company?._id || req.user.company : req.query.companyId;
  if (!companyId && req.query.company) companyId = req.query.company;
  if (!companyId) return res.status(400).json({ message: 'companyId is required' });
  const companyFilter = mongoose.isValidObjectId(companyId)
    ? { _id: companyId }
    : { slug: String(companyId).trim().toLowerCase() };
  const company = await Company.findOne(companyFilter).lean();
  if (!company || (req.user?.role !== 'company' && company.approvalStatus !== 'approved')) return res.status(404).json({ message: 'Company not found' });
  const query = { company: company._id };
  if (req.user?.role !== 'company') query.status = 'Active';
  return res.json({ services: await Service.find(query).sort({ name: 1 }).lean() });
};

exports.createService = async (req, res) => {
  const data = pick(req.body, FIELDS);
  const service = await Service.create({ ...data, company: req.company._id, serviceId: `SVC-${crypto.randomInt(100000, 999999)}` });
  broadcastMarketplace('service', req.company._id);
  return res.status(201).json({ service });
};

exports.updateService = async (req, res) => {
  const updates = pick(req.body, FIELDS);
  const service = await Service.findOneAndUpdate({ _id: req.params.id, company: req.company._id }, updates, { new: true, runValidators: true });
  if (!service) return res.status(404).json({ message: 'Service not found' });
  broadcastMarketplace('service', req.company._id);
  return res.json({ service });
};

exports.deleteService = async (req, res) => {
  const service = await Service.findOneAndDelete({ _id: req.params.id, company: req.company._id });
  if (!service) return res.status(404).json({ message: 'Service not found' });
  broadcastMarketplace('service', req.company._id);
  return res.status(204).end();
};

// Suggested offerings for the company's business category.
exports.getTemplates = async (req, res) => {
  const category = categoryOf(req.company.businessCategory);
  const existing = new Set((await Service.find({ company: req.company._id }, 'name').lean()).map((service) => service.name.toLowerCase()));
  return res.json({ category: category.label, templates: category.starter.map(starterRow).map((row) => ({ ...row, added: existing.has(row.name.toLowerCase()) })) });
};

// Adds the chosen suggestions (all of them by default) that the company does not have yet.
exports.applyTemplates = async (req, res) => {
  const category = categoryOf(req.company.businessCategory);
  const wanted = Array.isArray(req.body.names) ? new Set(req.body.names.map((name) => String(name).toLowerCase())) : null;
  const existing = new Set((await Service.find({ company: req.company._id }, 'name').lean()).map((service) => service.name.toLowerCase()));
  const rows = category.starter.map(starterRow).filter((row) => !existing.has(row.name.toLowerCase()) && (!wanted || wanted.has(row.name.toLowerCase())));
  const services = rows.length ? await Service.insertMany(rows.map((row) => ({ ...row, company: req.company._id, status: 'Active', serviceId: `SVC-${crypto.randomInt(100000, 999999)}` }))) : [];
  if (services.length) broadcastMarketplace('service', req.company._id);
  return res.status(201).json({ services });
};
