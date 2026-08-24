require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

async function setAdminCredentials() {
  const email = String(process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();
  const password = String(process.env.SUPER_ADMIN_PASSWORD || '');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Set a valid SUPER_ADMIN_EMAIL environment variable');
  if (!strongPassword.test(password)) throw new Error('SUPER_ADMIN_PASSWORD must have 10+ characters with uppercase, lowercase, number, and symbol');

  const connection = await connectDB();
  try {
    let admin = await User.findOne({ email }).select('+password');
    if (!admin) admin = await User.findOne({ role: 'super-admin' }).select('+password');
    if (!admin) admin = new User({ name: 'FleetOS Super Admin', role: 'super-admin' });
    admin.name = admin.name || 'FleetOS Super Admin';
    admin.email = email;
    admin.password = await bcrypt.hash(password, 12);
    admin.role = 'super-admin';
    admin.company = undefined;
    admin.status = 'active';
    admin.sessionVersion = Number(admin.sessionVersion || 0) + 1;
    await admin.save();
    await User.updateMany(
      { role: 'super-admin', _id: { $ne: admin._id } },
      { status: 'suspended', $inc: { sessionVersion: 1 } }
    );

    fs.rmSync(path.resolve(__dirname, '../../.runtime/dev-admin-password'), { force: true });
    console.log(`Super Admin credentials stored securely in MongoDB for ${admin.email}.`);
  } finally {
    await connection.close();
  }
}

setAdminCredentials().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
