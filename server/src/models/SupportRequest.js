const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
  resolution: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.models.SupportRequest || mongoose.model('SupportRequest', supportRequestSchema);
