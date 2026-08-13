const mongoose = require('mongoose');
const db = require('../data/db');

const technicianSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    techId: { type: String },
    name: { type: String, required: true },
    role: { type: String, default: 'Specialist' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    exp: { type: String, default: '1 Year Exp.' },
    status: { type: String, default: 'Available' },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);

const TechnicianModel = mongoose.models.Technician || mongoose.model('Technician', technicianSchema);
const isMongoConnected = () => mongoose.connection.readyState === 1;

const Technician = {
  async find(query = {}) {
    if (isMongoConnected()) {
      try {
        return await TechnicianModel.find(query).sort({ createdAt: -1 });
      } catch (err) {}
    }
    return db.find('technicians', query);
  },

  async findById(id) {
    if (isMongoConnected()) {
      try {
        return await TechnicianModel.findById(id);
      } catch (err) {}
    }
    return db.findById('technicians', id);
  },

  async create(data) {
    if (isMongoConnected()) {
      try {
        return await TechnicianModel.create(data);
      } catch (err) {}
    }
    return db.create('technicians', data);
  },

  async findByIdAndUpdate(id, update) {
    if (isMongoConnected()) {
      try {
        return await TechnicianModel.findByIdAndUpdate(id, update, { new: true });
      } catch (err) {}
    }
    const record = db.findById('technicians', id);
    if (!record) return null;
    const merged = { ...record, ...update };
    return db.save('technicians', merged);
  },

  async findByIdAndDelete(id) {
    if (isMongoConnected()) {
      try {
        return await TechnicianModel.findByIdAndDelete(id);
      } catch (err) {}
    }
    return db.remove('technicians', id);
  },
};

module.exports = Technician;
