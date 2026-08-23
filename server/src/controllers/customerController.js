const crypto = require('crypto');
const Customer = require('../models/Customer');
const { pick } = require('../utils/http');

exports.getCustomers = async (req, res) => res.json({ customers: await Customer.find({ company: req.company._id }).sort({ updatedAt: -1 }).lean() });

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
