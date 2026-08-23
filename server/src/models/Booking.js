const mongoose = require('mongoose');

const lifecycle = ['Pending', 'Assigned', 'En Route', 'Arrived', 'In Progress', 'Completed', 'Paid', 'Cancelled'];
const bookingSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
  serviceSnapshot: {
    name: { type: String, required: true },
    category: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
  },
  technician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null },
  customerName: { type: String, required: true },
  customerPhone: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  vehicle: {
    label: { type: String, default: '' },
    registration: { type: String, default: '' },
    make: { type: String, default: '' },
    model: { type: String, default: '' },
  },
  materials: [{ name: String, quantity: Number, unitPrice: Number }],
  pricing: {
    serviceTotal: { type: Number, default: 0 },
    materialsTotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    finalTotal: { type: Number, default: 0 },
  },
  status: { type: String, enum: lifecycle, default: 'Pending', index: true },
  statusHistory: [{ status: { type: String, enum: lifecycle }, at: Date, byRole: String, note: String }],
  scheduledAt: { type: Date, required: true },
  location: { type: String, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'invoice'], default: 'cash' },
  paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'failed'], default: 'unpaid', index: true },
  cancellationReason: { type: String, default: '' },
  idempotencyKey: { type: String },
  tracking: {
    lat: Number,
    lng: Number,
    destination: {
      lat: Number,
      lng: Number,
      label: String,
    },
    etaMinutes: Number,
    vehicleLabel: String,
    updatedAt: Date,
  },
}, { timestamps: true });

bookingSchema.index(
  { customer: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);
bookingSchema.statics.lifecycle = lifecycle;
module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
