const mongoose = require('mongoose');

const technicianSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  techId: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, default: 'Specialist' },
  phone: { type: String, default: '' },
  email: { type: String, default: '', lowercase: true },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  experienceYears: { type: Number, default: 1, min: 0 },
  status: { type: String, enum: ['Available', 'On Job', 'En Route', 'Off Duty'], default: 'Available', index: true },
  avatar: { type: String, default: '' },
  currentLocation: { lat: Number, lng: Number, label: String },
}, { timestamps: true });

technicianSchema.index({ company: 1, techId: 1 }, { unique: true });
module.exports = mongoose.models.Technician || mongoose.model('Technician', technicianSchema);
