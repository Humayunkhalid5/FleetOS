// ---------------------------------------------------------------------------
// FleetOS Server — Booking model (in-memory, no MongoDB)
// Supports the Mongoose-style API used by controllers and socket simulator:
//   create, findById, findOne, find, save
//   chainable: .populate('company', 'name slug logo'), .sort(...), .limit(...)
// ---------------------------------------------------------------------------

const mongoose = require('mongoose');
const db = require('../data/db');

// Generate a unique reference like #FOS-88219
const generateReference = () => `#FOS-${Math.floor(10000 + Math.random() * 90000)}`;

// Query builder that resolves to a booking (or array) and supports chaining
class BookingQuery {
  constructor(name, executor) {
    this.name = name;
    this.executor = executor;
    this.populateFields = [];
    this.sortField = null;
    this.limitValue = null;
  }

  populate(field, select) {
    this.populateFields.push({ field, select });
    return this;
  }

  sort(field) {
    this.sortField = field;
    return this;
  }

  limit(n) {
    this.limitValue = n;
    return this;
  }

  // Resolve the query (makes the query awaitable as a PromiseLike)
  then(onFulfilled, onRejected) {
    const result = this.executor({
      populateFields: this.populateFields,
      sortField: this.sortField,
      limitValue: this.limitValue,
    });
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }
}

const populateBooking = (booking, populateFields) => {
  if (!booking) return booking;
  let out = booking;
  for (const { field, select } of populateFields) {
    out = db.populate(out, field, 'companies', select);
  }
  return out;
};

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    technician: { type: String, default: '' },
    service: { type: String, default: '' },
    servicePrice: { type: Number, default: 0 },
    materials: [{ type: Object }],
    materialsTotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, default: 'in-progress' },
    scheduledDate: { type: String, default: '' },
    scheduledTime: { type: String, default: '' },
    location: { type: String, default: '' },
    paymentMethod: { type: String, default: 'card' },
    origin: { type: Object, default: {} },
    destination: { type: Object, default: {} },
    currentPosition: { type: Object, default: {} },
    vehicleLabel: { type: String, default: 'Fleet Van #012' },
    tracking: { type: Object, default: { stage: 'assigned', etaMinutes: 12 } },
    reference: { type: String, default: '' },
  },
  { timestamps: true }
);

const BookingModel = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

const isMongoConnected = () => mongoose.connection.readyState === 1;

const Booking = {
  async create(data) {
    if (isMongoConnected()) {
      try {
        const record = await BookingModel.create({ ...data, reference: data.reference || generateReference() });
        return record.toObject ? record.toObject() : record;
      } catch (err) {}
    }
    return db.create('bookings', {
      ...data,
      reference: data.reference || generateReference(),
    });
  },

  findById(id) {
    return new BookingQuery('bookings', async ({ populateFields }) => {
      if (isMongoConnected()) {
        try {
          const record = await BookingModel.findById(id).populate('company', 'name slug logo');
          return populateBooking(record ? (record.toObject ? record.toObject() : record) : null, populateFields);
        } catch (err) {}
      }
      const record = db.findById('bookings', id);
      return populateBooking(record, populateFields);
    });
  },

  findOne(query = {}) {
    return new BookingQuery('bookings', async ({ populateFields }) => {
      if (isMongoConnected()) {
        try {
          const record = await BookingModel.findOne(query).populate('company', 'name slug logo');
          return populateBooking(record ? (record.toObject ? record.toObject() : record) : null, populateFields);
        } catch (err) {}
      }
      const record = db.findOne('bookings', query);
      return populateBooking(record, populateFields);
    });
  },

  find(query = {}) {
    return new BookingQuery('bookings', async ({ populateFields, sortField, limitValue }) => {
      if (isMongoConnected()) {
        try {
          let records = await BookingModel.find(query).populate('company', 'name slug logo');
          if (sortField) {
            const dir = sortField.startsWith('-') ? -1 : 1;
            const key = sortField.replace(/^-/, '');
            records = records.slice().sort((a, b) => {
              const av = a[key] ? new Date(a[key]).getTime() : 0;
              const bv = b[key] ? new Date(b[key]).getTime() : 0;
              return (av - bv) * dir;
            });
          }
          if (limitValue) records = records.slice(0, limitValue);
          return records.map((r) => populateBooking(r ? (r.toObject ? r.toObject() : r) : null, populateFields));
        } catch (err) {}
      }
      let records = db.find('bookings', query);
      if (sortField) {
        const dir = sortField.startsWith('-') ? -1 : 1;
        const key = sortField.replace(/^-/, '');
        records = records.slice().sort((a, b) => {
          const av = a[key] ? new Date(a[key]).getTime() : 0;
          const bv = b[key] ? new Date(b[key]).getTime() : 0;
          return (av - bv) * dir;
        });
      }
      if (limitValue) records = records.slice(0, limitValue);
      records = records.map((r) => populateBooking(r, populateFields));
      return records;
    });
  },

  async save(record) {
    if (!record || !record._id) return null;
    if (isMongoConnected()) {
      try {
        const saved = await BookingModel.findByIdAndUpdate(record._id, record, { new: true });
        return saved ? (saved.toObject ? saved.toObject() : saved) : null;
      } catch (err) {}
    }
    return db.save('bookings', record);
  },
};

module.exports = Booking;


