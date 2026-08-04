// ---------------------------------------------------------------------------
// FleetOS Server — Bootstrap: load demo seed data into the in-memory store.
// Called automatically on server start so no MongoDB or `npm run seed` needed.
// ---------------------------------------------------------------------------

const db = require('./db');
const { demoUser, companies, demoBooking, demoReviews } = require('./seedData');
const bcrypt = require('bcryptjs');

const hashPassword = async (pw) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
};

const bootstrap = async () => {
  // Clear existing data
  db.resetStore();

  // Create demo user (hash password)
  const hashed = await hashPassword(demoUser.password);
  const user = db.create('users', { ...demoUser, password: hashed });

  // Create companies
  const createdCompanies = companies.map((c) => db.create('companies', c));
  const swiftfleet = createdCompanies.find((c) => c.slug === 'swiftfleet');

  // Create demo booking (reference user + company ids)
  const booking = db.create('bookings', {
    ...demoBooking,
    user: user._id,
    company: swiftfleet._id,
    reference: `#FOS-${Math.floor(10000 + Math.random() * 90000)}`,
  });

  // Create demo reviews
  demoReviews.forEach((r) => {
    db.create('reviews', {
      ...r,
      user: user._id,
      booking: booking._id,
      company: swiftfleet._id,
    });
  });

  console.log('In-memory data seeded.');
  console.log('Login with: alex@fleetos.com / demo1234');

  return { user, companies: createdCompanies, booking };
};

module.exports = bootstrap;
