const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  customerId: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', lowercase: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  totalJobs: { type: Number, default: 0, min: 0 },
  totalSpent: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

customerSchema.index({ company: 1, customerId: 1 }, { unique: true });
module.exports = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
