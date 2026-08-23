const crypto = require('crypto');
const Service = require('../models/Service');
const Company = require('../models/Company');
const { pick } = require('../utils/http');

exports.getServices = async (req, res) => {
  if (req.user?.role === 'company' && req.user.company?.approvalStatus !== 'approved') {
    return res.status(403).json({ message: 'Company approval is required before accessing operations' });
  }
  let companyId = req.user?.role === 'company' ? req.user.company?._id || req.user.company : req.query.companyId;
  if (!companyId && req.query.company) companyId = req.query.company;
  if (!companyId) return res.status(400).json({ message: 'companyId is required' });
  const company = await Company.findById(companyId).lean();
  if (!company || (req.user?.role !== 'company' && company.approvalStatus !== 'approved')) return res.status(404).json({ message: 'Company not found' });
  const query = { company: companyId };
  if (req.user?.role !== 'company') query.status = 'Active';
  return res.json({ services: await Service.find(query).sort({ name: 1 }).lean() });
};

exports.createService = async (req, res) => {
  const data = pick(req.body, ['name', 'category', 'price', 'durationMinutes', 'status', 'description']);
  const service = await Service.create({ ...data, company: req.company._id, serviceId: `SVC-${crypto.randomInt(100000, 999999)}` });
  return res.status(201).json({ service });
};

exports.updateService = async (req, res) => {
  const updates = pick(req.body, ['name', 'category', 'price', 'durationMinutes', 'status', 'description']);
  const service = await Service.findOneAndUpdate({ _id: req.params.id, company: req.company._id }, updates, { new: true, runValidators: true });
  if (!service) return res.status(404).json({ message: 'Service not found' });
  return res.json({ service });
};

exports.deleteService = async (req, res) => {
  const service = await Service.findOneAndDelete({ _id: req.params.id, company: req.company._id });
  if (!service) return res.status(404).json({ message: 'Service not found' });
  return res.status(204).end();
};
