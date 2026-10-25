const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  description: { type: String, default: '', maxlength: 1200 },
  businessCategory: { type: String, default: 'field-services', index: true },
  // Subset of the category's fulfilment types this business offers (empty = all of them).
  fulfillmentOptions: [{ type: String, enum: ['onsite', 'delivery', 'pickup', 'instore', 'remote'] }],
  deliveryFee: { type: Number, default: 0, min: 0, max: 100000 },
  // Used only by the built-in demonstration catalogue migration. It is never
  // applied to a company created by a real owner.
  seedProfileVersion: { type: Number, default: 0, select: false },
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
  clientListed: { type: Boolean, default: true, index: true },
  approvalVersion: { type: Number, default: 1 },
  approvedAt: { type: Date, default: null },
  locationCoordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [73.0479, 33.6844] },
  },
}, { timestamps: true });

companySchema.virtual('verified').get(function verified() { return this.approvalStatus === 'approved'; });
companySchema.set('toJSON', { virtuals: true });
companySchema.index({ approvalStatus: 1, city: 1, rating: -1, updatedAt: -1, name: 1 });
companySchema.index({ approvalStatus: 1, rating: -1, updatedAt: -1, name: 1 });
companySchema.index({ locationCoordinates: '2dsphere' });

module.exports = mongoose.models.Company || mongoose.model('Company', companySchema);
