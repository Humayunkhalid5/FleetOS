const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema({
  // Signed-in customers/companies are linked; public contact-form visitors
  // are recorded by name and email instead.
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  contactName: { type: String, trim: true, maxlength: 120, default: '' },
  contactEmail: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
  topic: { type: String, trim: true, maxlength: 60, default: 'General inquiry' },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
  resolution: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.models.SupportRequest || mongoose.model('SupportRequest', supportRequestSchema);
