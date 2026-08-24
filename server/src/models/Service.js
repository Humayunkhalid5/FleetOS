const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  serviceId: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, default: 'Mechanical', trim: true },
  price: { type: Number, required: true, min: 0 },
  durationMinutes: { type: Number, default: 60, min: 15 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  description: { type: String, default: '', maxlength: 800 },
}, { timestamps: true });

serviceSchema.index({ company: 1, serviceId: 1 }, { unique: true });
serviceSchema.index({ status: 1, category: 1, name: 1, company: 1 });
module.exports = mongoose.models.Service || mongoose.model('Service', serviceSchema);
