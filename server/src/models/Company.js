const mongoose = require('mongoose');
const db = require('../data/db');

class CompanyQuery {
  constructor(executor) {
    this.executor = executor;
    this.sortField = null;
  }

  sort(field) {
    this.sortField = field;
    return this;
  }

  then(onFulfilled, onRejected) {
    const result = this.executor({ sortField: this.sortField });
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }
}

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true },
    description: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    heroImage: { type: String, default: '' },
    logo: { type: String, default: '' },
location: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: 'Pakistan' },
    areas: [{ type: String }],
    services: [{ type: Object }],
    technicians: [{ type: Object }],
    gallery: [{ type: String }],
    verified: { type: Boolean, default: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { timestamps: true }
);

const CompanyModel = mongoose.models.Company || mongoose.model('Company', companySchema);

const Company = {
  find(query = {}) {
    return new CompanyQuery(async ({ sortField }) => {
      try {
        let results = await CompanyModel.find(query);
        if (sortField) {
          const dir = sortField.startsWith('-') ? -1 : 1;
          const key = sortField.replace(/^-/, '');
          results = results.slice().sort((a, b) => (a[key] - b[key]) * dir);
        }
        return results;
      } catch {
        return db.find('companies', query);
      }
    });
  },

  async findById(id) {
    try {
      return await CompanyModel.findById(id);
    } catch {
      return db.findById('companies', id);
    }
  },

  async findOne(query = {}) {
    try {
      return await CompanyModel.findOne(query);
    } catch {
      return db.findOne('companies', query);
    }
  },

  async create(data) {
    try {
      return await CompanyModel.create(data);
    } catch {
      return db.create('companies', data);
    }
  },

  async findByIdAndUpdate(id, update) {
    try {
      return await CompanyModel.findByIdAndUpdate(id, update, { new: true });
    } catch {
      const record = db.findById('companies', id);
      if (!record) return null;
      const merged = { ...record, ...update };
      return db.save('companies', merged);
    }
  },
};

module.exports = Company;
