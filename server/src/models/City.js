const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name: { type: String, required: true },
  province: { type: String, required: true },
  country: { type: String, default: 'Pakistan' },
}, { timestamps: true });

citySchema.index({ name: 1, province: 1 }, { unique: true });
module.exports = mongoose.models.City || mongoose.model('City', citySchema);
