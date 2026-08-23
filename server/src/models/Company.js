const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  description: { type: String, default: '', maxlength: 1200 },
  registrationNumber: { type: String, default: '', trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  location: { type: String, default: '', trim: true },
  city: { type: String, required: true, trim: true, index: true },
  province: { type: String, default: '' },
  country: { type: String, default: 'Pakistan' },
  areas: [{ type: String, trim: true }],
  logo: { type: String, default: '' },
  businessLicense: {
    name: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    data: { type: String, default: '', select: false },
    uploadedAt: { type: Date, default: null },
  },
  heroImage: { type: String, default: '' },
  gallery: [{ type: String }],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true },
  approvalVersion: { type: Number, default: 1 },
  approvedAt: { type: Date, default: null },
}, { timestamps: true });

companySchema.virtual('verified').get(function verified() { return this.approvalStatus === 'approved'; });
companySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.models.Company || mongoose.model('Company', companySchema);
