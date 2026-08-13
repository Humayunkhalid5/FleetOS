const mongoose = require('mongoose');
const db = require('../data/db');

const customerSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    customerId: { type: String },
    name: { type: String, required: true },
    contact: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    totalJobs: { type: Number, default: 0 },
    totalSpent: { type: String, default: '$0.00' },
    status: { type: String, default: 'Active Account' },
  },
  { timestamps: true }
);

const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const isMongoConnected = () => mongoose.connection.readyState === 1;

const Customer = {
  async find(query = {}) {
    if (isMongoConnected()) {
      try {
        return await CustomerModel.find(query).sort({ createdAt: -1 });
      } catch (err) {}
    }
    return db.find('customers', query);
  },

  async findById(id) {
    if (isMongoConnected()) {
      try {
        return await CustomerModel.findById(id);
      } catch (err) {}
    }
    return db.findById('customers', id);
  },

  async create(data) {
    if (isMongoConnected()) {
      try {
        return await CustomerModel.create(data);
      } catch (err) {}
    }
    return db.create('customers', data);
  },

  async findByIdAndUpdate(id, update) {
    if (isMongoConnected()) {
      try {
        return await CustomerModel.findByIdAndUpdate(id, update, { new: true });
      } catch (err) {}
    }
    const record = db.findById('customers', id);
    if (!record) return null;
    const merged = { ...record, ...update };
    return db.save('customers', merged);
  },

  async findByIdAndDelete(id) {
    if (isMongoConnected()) {
      try {
        return await CustomerModel.findByIdAndDelete(id);
      } catch (err) {}
    }
    return db.remove('customers', id);
  },
};

module.exports = Customer;
