const Inventory = require('../models/Inventory');

// @desc   Get inventory items for a company
// @route  GET /api/inventory
exports.getInventory = async (req, res) => {
  try {
    const companyId = req.query.companyId || req.user?.companyId || req.user?.id;
    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }
    const items = await Inventory.find({ companyId });
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Create inventory item
// @route  POST /api/inventory
exports.createInventoryItem = async (req, res) => {
  try {
    const companyId = req.body.companyId || req.user?.companyId || req.user?.id;
    const { name, category, qty, threshold, unitCost, unitPrice, unit } = req.body;

    if (!companyId || !name) {
      return res.status(400).json({ message: 'Company ID and item name are required' });
    }

    const sku = req.body.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    const item = await Inventory.create({
      companyId,
      sku,
      name,
      category: category || 'Spare Parts',
      qty: Number(qty) || 0,
      threshold: Number(threshold) || 5,
      unitCost: Number(unitCost) || 0,
      unitPrice: Number(unitPrice) || 0,
      unit: unit || 'Units',
    });

    return res.status(201).json({ item });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Update inventory item
// @route  PUT /api/inventory/:id
exports.updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Inventory.findByIdAndUpdate(id, req.body);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    return res.json({ item });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Delete inventory item
// @route  DELETE /api/inventory/:id
exports.deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    await Inventory.findByIdAndDelete(id);
    return res.json({ message: 'Inventory item deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
