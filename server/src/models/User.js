const mongoose = require('mongoose');
const db = require('../data/db');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    role: { type: String, default: 'customer' },
    plan: { type: String, default: 'Basic' },
    avatar: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    verificationCode: { type: String, default: '' },
  },
  { timestamps: true }
);

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

const sanitize = (record, select) => {
  if (!record) return record;
  const out = db.clone(record);
  if (select === '-password') {
    delete out.password;
  }
  return out;
};

const User = {
  async findOne(query, select) {
    try {
      const record = await UserModel.findOne(query);
      if (!record) return null;
      if (select === '+password') return record;
      return sanitize(record.toObject ? record.toObject() : record, '-password');
    } catch {
      const record = db.findOne('users', query);
      if (select === '+password') return record;
      return sanitize(record, '-password');
    }
  },

  async findById(id, select) {
    try {
      const record = await UserModel.findById(id);
      if (!record) return null;
      return sanitize(record.toObject ? record.toObject() : record, select || '-password');
    } catch {
      const record = db.findById('users', id);
      return sanitize(record, select || '-password');
    }
  },

  async create(data) {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(data.password, salt);
    try {
      const record = await UserModel.create({ ...data, password: hashed });
      return sanitize(record.toObject ? record.toObject() : record, '-password');
    } catch {
      const record = db.create('users', { ...data, password: hashed });
      return sanitize(record, '-password');
    }
  },

  async save(record) {
    if (!record) return record;
    try {
      const stored = await UserModel.findById(record._id);
      if (!stored) return null;
      const merged = { ...stored.toObject(), ...record };
      if (record.password && record.password !== stored.password) {
        const salt = await bcrypt.genSalt(10);
        merged.password = await bcrypt.hash(record.password, salt);
      }
      const saved = await UserModel.findByIdAndUpdate(record._id, merged, { new: true });
      return sanitize(saved.toObject ? saved.toObject() : saved, '-password');
    } catch {
      const stored = db.findById('users', record._id);
      if (!stored) return null;
      const merged = { ...stored, ...record };
      if (record.password && record.password !== stored.password) {
        const salt = await bcrypt.genSalt(10);
        merged.password = await bcrypt.hash(record.password, salt);
      }
      const saved = db.save('users', merged);
      return sanitize(saved, '-password');
    }
  },

  async _findWithPassword(query) {
    try {
      return await UserModel.findOne(query);
    } catch {
      return db.findOne('users', query);
    }
  },
};

module.exports = User;
