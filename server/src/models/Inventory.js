const mongoose = require('mongoose');
const db = require('../data/db');

const inventorySchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, default: 'Spare Parts' },
    qty: { type: Number, default: 0 },
    threshold: { type: Number, default: 5 },
    unitCost: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    unit: { type: String, default: 'Units' },
  },
  { timestamps: true }
);

const InventoryModel = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);
const isMongoConnected = () => mongoose.connection.readyState === 1;

const Inventory = {
  async find(query = {}) {
    if (isMongoConnected()) {
      try {
        return await InventoryModel.find(query).sort({ createdAt: -1 });
      } catch (err) {}
    }
    return db.find('inventories', query);
  },

  async findById(id) {
    if (isMongoConnected()) {
      try {
        return await InventoryModel.findById(id);
      } catch (err) {}
    }
    return db.findById('inventories', id);
  },

  async create(data) {
    if (isMongoConnected()) {
      try {
        return await InventoryModel.create(data);
      } catch (err) {}
    }
    return db.create('inventories', data);
  },

  async findByIdAndUpdate(id, update) {
    if (isMongoConnected()) {
      try {
        return await InventoryModel.findByIdAndUpdate(id, update, { new: true });
      } catch (err) {}
    }
    const record = db.findById('inventories', id);
    if (!record) return null;
    const merged = { ...record, ...update };
    return db.save('inventories', merged);
  },

  async findByIdAndDelete(id) {
    if (isMongoConnected()) {
      try {
        return await InventoryModel.findByIdAndDelete(id);
      } catch (err) {}
    }
    return db.remove('inventories', id);
  },
};

module.exports = Inventory;
