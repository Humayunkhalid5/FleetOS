const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production');

  const runtimeDir = path.resolve(__dirname, '../../.runtime');
  const secretPath = path.join(runtimeDir, 'jwt-secret');
  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, crypto.randomBytes(48).toString('hex'), 'utf8');
  return fs.readFileSync(secretPath, 'utf8').trim();
}

module.exports = { getJwtSecret };
