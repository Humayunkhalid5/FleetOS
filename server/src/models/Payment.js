const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['cash', 'card', 'invoice'], required: true },
  status: { type: String, enum: ['pending', 'recorded', 'failed', 'refunded'], default: 'pending', index: true },
  recordedAt: { type: Date, default: null },
  provider: { type: String, enum: ['manual', 'stripe'], default: 'manual' },
  providerSessionId: { type: String, default: '', index: true },
  providerPaymentIntentId: { type: String, default: '' },
  idempotencyKey: { type: String },
}, { timestamps: true });

paymentSchema.index(
  { customer: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);
module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
