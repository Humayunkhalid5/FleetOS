require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

async function reset() {
  if (process.env.NODE_ENV === 'production') throw new Error('The development Admin reset is disabled in production');
  const connection = await connectDB();
  const password = `Fleet-${crypto.randomBytes(8).toString('base64url')}!7a`;
  const admin = await User.findOneAndUpdate(
    { role: 'super-admin' },
    {
      $set: { password: await bcrypt.hash(password, 12), status: 'active' },
      $inc: { sessionVersion: 1 },
    },
    { new: true },
  );
  if (!admin) throw new Error('Start FleetOS once so the Super Admin account can be created');
  const runtimeDir = path.resolve(__dirname, '../../.runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(path.join(runtimeDir, 'dev-admin-password'), password, 'utf8');
  console.log(`Super Admin: ${admin.email}`);
  console.log(`Super Admin password: ${password}`);
  await connection.close();
}

reset().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
