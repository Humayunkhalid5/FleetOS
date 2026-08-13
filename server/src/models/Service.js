const mongoose = require('mongoose');
const db = require('../data/db');

const serviceSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    serviceId: { type: String },
    name: { type: String, required: true },
    category: { type: String, default: 'Mechanical' },
    price: { type: Number, default: 0 },
    duration: { type: String, default: '1 Hour' },
    status: { type: String, default: 'Active' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const ServiceModel = mongoose.models.Service || mongoose.model('Service', serviceSchema);
const isMongoConnected = () => mongoose.connection.readyState === 1;

const Service = {
  async find(query = {}) {
    if (isMongoConnected()) {
      try {
        return await ServiceModel.find(query).sort({ createdAt: -1 });
      } catch (err) {}
    }
    return db.find('services', query);
  },

  async findById(id) {
    if (isMongoConnected()) {
      try {
        return await ServiceModel.findById(id);
      } catch (err) {}
    }
    return db.findById('services', id);
  },

  async create(data) {
    if (isMongoConnected()) {
      try {
        return await ServiceModel.create(data);
      } catch (err) {}
    }
    return db.create('services', data);
  },

  async findByIdAndUpdate(id, update) {
    if (isMongoConnected()) {
      try {
        return await ServiceModel.findByIdAndUpdate(id, update, { new: true });
      } catch (err) {}
    }
    const record = db.findById('services', id);
    if (!record) return null;
    const merged = { ...record, ...update };
    return db.save('services', merged);
  },

  async findByIdAndDelete(id) {
    if (isMongoConnected()) {
      try {
        return await ServiceModel.findByIdAndDelete(id);
      } catch (err) {}
    }
    return db.remove('services', id);
  },
};

module.exports = Service;
