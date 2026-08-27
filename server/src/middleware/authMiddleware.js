const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const { getJwtSecret } = require('../config/security');

function readCookie(req, name) {
  const source = req.headers.cookie || '';
  const pair = source.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

async function protectWithCookie(req, res, next, cookieName, allowBearer = true) {
  try {
    const bearer = allowBearer && req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    // Prefer the explicit Authorization token. This lets a customer and a
    // company use the two FleetOS portal routes side-by-side in one browser
    // without the most recent HttpOnly cookie replacing the other identity.
    const token = bearer || readCookie(req, cookieName);
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const payload = jwt.verify(token, getJwtSecret());
    const user = await User.findById(payload.sub).populate('company');
    if (!user || user.status !== 'active' || user.sessionVersion !== payload.sv) {
      return res.status(401).json({ message: 'Session is no longer valid' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Session expired or invalid' });
  }
}

async function protect(req, res, next) {
  return protectWithCookie(req, res, next, 'fleetos_session');
}

async function protectAdmin(req, res, next) {
  return protectWithCookie(req, res, next, 'fleetos_admin_session', true);
}

async function optionalProtect(req, res, next) {
  const hasToken = Boolean(readCookie(req, 'fleetos_session') || req.headers.authorization?.startsWith('Bearer '));
  if (!hasToken) return next();
  return protect(req, res, next);
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'You do not have access to this resource' });
    return next();
  };
}

async function requireApprovedCompany(req, res, next) {
  if (req.user.role !== 'company') return res.status(403).json({ message: 'Company account required' });
  const companyId = req.user.company?._id || req.user.company;
  const company = req.user.company?.approvalStatus ? req.user.company : await Company.findById(companyId);
  if (!company || company.approvalStatus !== 'approved') {
    return res.status(403).json({ message: 'Company approval is required before accessing operations', approvalStatus: company?.approvalStatus || 'pending' });
  }
  req.company = company;
  return next();
}

module.exports = { protect, protectAdmin, optionalProtect, requireRole, requireApprovedCompany, readCookie };
