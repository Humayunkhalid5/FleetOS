const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'company', 'super-admin'], default: 'customer', index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
  phone: { type: String, default: '', trim: true },
  address: { type: String, default: '', trim: true },
  city: { type: String, default: '', trim: true },
  avatar: { type: String, default: '' },
  plan: { type: String, default: 'Free Member', trim: true },
  googleId: { type: String, sparse: true, unique: true },
  linkedinId: { type: String, sparse: true, unique: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  sessionVersion: { type: Number, default: 1 },
  lastLoginAt: { type: Date, default: null },
  bookingDraft: { type: mongoose.Schema.Types.Mixed, default: null, select: false },
}, { timestamps: true });

userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.sessionVersion;
    return ret;
  },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
