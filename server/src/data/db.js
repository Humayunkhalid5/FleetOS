// ---------------------------------------------------------------------------
// FleetOS Server — In-memory data store
// Replaces MongoDB/Mongoose with a lightweight in-memory collection so the app
// runs with just an Express backend (no database server required).
// ---------------------------------------------------------------------------

const crypto = require('crypto');

// Generate a Mongo-style 24-hex ObjectId string
const generateId = () => crypto.randomBytes(12).toString('hex');

const now = () => new Date().toISOString();

// Deep clone (avoids accidental mutation of the stored records)
const clone = (value) => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(clone);
  if (typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = clone(value[key]);
    }
    return out;
  }
  return value;
};

// Internal store
const store = {
  users: [],
  companies: [],
  bookings: [],
  reviews: [],
  chatMessages: [],
};

// Generic collection helpers
const collection = (name) => store[name];

const findById = (name, id) => {
  const rec = collection(name).find((r) => r._id === id);
  return rec ? clone(rec) : null;
};

const findOne = (name, query = {}) => {
  const rec = collection(name).find((r) => matches(r, query));
  return rec ? clone(rec) : null;
};

const find = (name, query = {}) => {
  return collection(name).filter((r) => matches(r, query)).map(clone);
};

const count = (name, query = {}) => collection(name).filter((r) => matches(r, query)).length;

// Simple equality matcher supporting nested paths and $ne, $in
const matches = (record, query) => {
  for (const key of Object.keys(query)) {
    const expected = query[key];

    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if (expected.$ne !== undefined) {
        if (getPath(record, key) === expected.$ne) return false;
        continue;
      }
      if (expected.$in !== undefined) {
        if (!expected.$in.includes(getPath(record, key))) return false;
        continue;
      }
      // Nested object equality (e.g. tracking.stage)
      if (key.includes('.')) {
        if (getPath(record, key) !== expected) return false;
        continue;
      }
    }

    if (getPath(record, key) !== expected) return false;
  }
  return true;
};

const getPath = (obj, path) => {
  return path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
};

// Create a new record with timestamps + id
const create = (name, data) => {
  const record = clone(data);
  record._id = record._id || generateId();
  record.createdAt = record.createdAt || now();
  record.updatedAt = record.updatedAt || now();
  collection(name).push(record);
  return clone(record);
};

const insertMany = (name, dataArray) => {
  return dataArray.map((data) => create(name, data));
};

const deleteMany = (name, query = {}) => {
  const arr = collection(name);
  const before = arr.length;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (matches(arr[i], query)) arr.splice(i, 1);
  }
  return before - arr.length;
};

// Replace a record in place (by id) and return the updated record
const save = (name, record) => {
  if (!record || !record._id) return null;
  const idx = collection(name).findIndex((r) => r._id === record._id);
  if (idx === -1) return null;
  record.updatedAt = now();
  collection(name)[idx] = clone(record);
  return clone(collection(name)[idx]);
};

// Remove a record by id
const remove = (name, id) => {
  const arr = collection(name);
  const idx = arr.findIndex((r) => r._id === id);
  if (idx === -1) return null;
  return arr.splice(idx, 1)[0];
};

// Populate a reference field with the full target object (like Mongoose .populate)
const populate = (record, field, targetName, select) => {
  if (!record) return record;
  const out = clone(record);
  const refId = out[field];
  if (!refId) return out;
  const target = findById(targetName, refId);
  if (target) {
    if (select) {
      const picked = {};
      select.split(' ').forEach((k) => {
        if (k) picked[k] = target[k];
      });
      out[field] = picked;
    } else {
      out[field] = target;
    }
  }
  return out;
};

// Reset the store (used for tests / reseeding)
const resetStore = (nextData) => {
  store.users = [];
  store.companies = [];
  store.bookings = [];
  store.reviews = [];
  store.chatMessages = [];
  if (nextData) {
    if (nextData.users) store.users = clone(nextData.users);
    if (nextData.companies) store.companies = clone(nextData.companies);
    if (nextData.bookings) store.bookings = clone(nextData.bookings);
    if (nextData.reviews) store.reviews = clone(nextData.reviews);
    if (nextData.chatMessages) store.chatMessages = clone(nextData.chatMessages);
  }
};

module.exports = {
  generateId,
  now,
  clone,
  store,
  collection,
  findById,
  findOne,
  find,
  count,
  create,
  insertMany,
  deleteMany,
  save,
  remove,
  populate,
  resetStore,
};
