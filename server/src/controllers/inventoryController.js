const crypto = require('crypto');
const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Company = require('../models/Company');
const User = require('../models/User');
const { pick } = require('../utils/http');

exports.getPublicInventory = async (req, res) => {
  const identifier = req.query.companyId || req.query.company || req.params.companyId;
  if (!identifier) return res.status(400).json({ message: 'companyId is required' });

  const filter = mongoose.isValidObjectId(identifier) ? { _id: identifier } : { slug: String(identifier).toLowerCase() };
  const company = await Company.findOne({ ...filter, approvalStatus: 'approved' }).select('_id owner').lean();
  if (!company) return res.status(404).json({ message: 'Approved company not found' });

  if (company.owner) {
    const owner = await User.findById(company.owner).select('status').lean();
    if (owner?.status === 'suspended') return res.status(404).json({ message: 'Approved company not found' });
  }

  const inventory = await Inventory.find({ company: company._id, quantity: { $gt: 0 } })
    .select('sku name category quantity unitPrice unit')
    .sort({ category: 1, name: 1 })
    .lean();

  return res.json({
    inventory: inventory.map((item) => ({
      id: item._id,
      _id: item._id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      qty: item.quantity,
      unitPrice: item.unitPrice,
      unit: item.unit,
    })),
  });
};

exports.getInventory = async (req, res) => {
  const inventory = await Inventory.find({ company: req.company._id }).sort({ name: 1 }).lean();
  return res.json({ inventory: inventory.map((item) => ({ ...item, qty: item.quantity, threshold: item.reorderLevel })) });
};

exports.createInventoryItem = async (req, res) => {
  const data = pick(req.body, ['sku', 'name', 'category', 'quantity', 'reorderLevel', 'unitCost', 'unitPrice', 'unit', 'warehouse']);
  if (req.body.qty !== undefined) data.quantity = req.body.qty;
  if (req.body.threshold !== undefined) data.reorderLevel = req.body.threshold;
  const inventory = await Inventory.create({ ...data, company: req.company._id, sku: data.sku || `SKU-${crypto.randomInt(10000, 99999)}` });
  return res.status(201).json({ inventory });
};

exports.updateInventoryItem = async (req, res) => {
  const updates = pick(req.body, ['sku', 'name', 'category', 'quantity', 'reorderLevel', 'unitCost', 'unitPrice', 'unit', 'warehouse']);
  if (req.body.qty !== undefined) updates.quantity = req.body.qty;
  if (req.body.threshold !== undefined) updates.reorderLevel = req.body.threshold;
  const inventory = await Inventory.findOneAndUpdate({ _id: req.params.id, company: req.company._id }, updates, { new: true, runValidators: true });
  if (!inventory) return res.status(404).json({ message: 'Inventory item not found' });
  return res.json({ inventory });
};

exports.deleteInventoryItem = async (req, res) => {
  const inventory = await Inventory.findOneAndDelete({ _id: req.params.id, company: req.company._id });
  if (!inventory) return res.status(404).json({ message: 'Inventory item not found' });
  return res.status(204).end();
};
