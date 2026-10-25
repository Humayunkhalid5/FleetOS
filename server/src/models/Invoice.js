const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  serviceName: { type: String, required: true },
  laborFee: { type: Number, required: true, min: 0 },
  materialsCost: { type: Number, default: 0, min: 0 },
  travelFee: { type: Number, default: 0, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  netTotal: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'cancelled'], default: 'paid', index: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'invoice'], default: 'cash' },
  issuedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
