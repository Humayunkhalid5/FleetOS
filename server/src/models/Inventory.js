const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  sku: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, default: 'Spare Parts' },
  quantity: { type: Number, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 5, min: 0 },
  unitCost: { type: Number, default: 0, min: 0 },
  unitPrice: { type: Number, default: 0, min: 0 },
  unit: { type: String, default: 'Units' },
  warehouse: { type: String, default: 'Main' },
}, { timestamps: true });

inventorySchema.index({ company: 1, sku: 1 }, { unique: true });
module.exports = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);
