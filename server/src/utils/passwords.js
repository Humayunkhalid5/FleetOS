const bcrypt = require('bcryptjs');

// bcryptjs is pure JavaScript: cost 12 took ~0.8 s per hash or check here,
// which made sign-in and password changes feel stuck. Cost 10 is the common
// recommended minimum (~0.2 s). Older cost-12 hashes still verify and are
// upgraded the next time that person signs in.
const PASSWORD_COST = 10;

const hashPassword = (plain) => bcrypt.hash(String(plain), PASSWORD_COST);
const verifyPassword = (plain, hash) => bcrypt.compare(String(plain || ''), String(hash || ''));
const needsRehash = (hash) => {
  try { return bcrypt.getRounds(String(hash)) !== PASSWORD_COST; } catch { return false; }
};

module.exports = { PASSWORD_COST, hashPassword, verifyPassword, needsRehash };
