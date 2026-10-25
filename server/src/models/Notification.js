const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  recipientCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: { type: String, enum: ['booking', 'dispatch', 'status_change', 'invoice', 'review', 'system'], default: 'booking', index: true },
  referenceId: { type: String, default: '' },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
