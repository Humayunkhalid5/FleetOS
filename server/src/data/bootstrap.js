// ---------------------------------------------------------------------------
// FleetOS Server — Bootstrap: load demo seed data.
// Uses the shared models (which support MongoDB when connected, otherwise
// fall back to the in-memory store). Called automatically on server start.
// ---------------------------------------------------------------------------

const db = require('./db');
const User = require('../models/User');
const Company = require('../models/Company');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { demoUser, companies, demoBooking, demoReviews } = require('./seedData');
const bcrypt = require('bcryptjs');

const hashPassword = async (pw) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
};

const bootstrap = async () => {
  // Clear existing data
  db.resetStore();

  // Also clear MongoDB collections if connected (best-effort).
  const mongoose = require('mongoose');
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      await Promise.all([
        User.collection ? User.collection.deleteMany({}) : Promise.resolve(),
        Company.collection ? Company.collection.deleteMany({}) : Promise.resolve(),
        Booking.collection ? Booking.collection.deleteMany({}) : Promise.resolve(),
        Review.collection ? Review.collection.deleteMany({}) : Promise.resolve(),
      ]);
    } catch (err) {
      console.warn('Could not clear MongoDB collections:', err.message);
    }
  }
};

const bootstrap = async () => {
  await clearExisting();

  // Create demo user (hash password)
  const hashed = await hashPassword(demoUser.password);
  const user = await User.create({ ...demoUser, password: hashed });

  // Create companies
  const createdCompanies = [];
  for (const c of companies) {
    const record = await Company.create(c);
    createdCompanies.push(record);
  }
  const swiftfleet = createdCompanies.find((c) => c.slug === 'swiftfleet');

  // Create demo booking (reference user + company ids)
  const booking = await Booking.create({
    ...demoBooking,
    user: user._id,
    company: swiftfleet?._id || createdCompanies[0]?._id,
    reference: `#FOS-${Math.floor(10000 + Math.random() * 90000)}`,
  });

  // Create demo reviews
  for (const r of demoReviews) {
    await Review.create({
      ...r,
      user: user._id,
      booking: booking._id,
      company: swiftfleet?._id || createdCompanies[0]?._id,
    });
  }

  console.log('In-memory data seeded.');
  console.log('Login with: alex@fleetos.com / demo1234');

  return { user, companies: createdCompanies, booking };
};

module.exports = bootstrap;
