const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');
const { getJwtSecret } = require('../config/security');
const { pick, slugify } = require('../utils/http');
const { validateLogo, validateBusinessLicense } = require('../utils/uploads');
const { broadcastPlatform } = require('../socket');

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

function publicUser(user) {
  const data = user.toJSON ? user.toJSON() : { ...user };
  const company = data.company;
  if (company && typeof company === 'object') {
    data.companyId = company._id;
    data.companyName = company.name;
    data.companyLogo = company.logo || '';
    data.companySlug = company.slug || '';
    data.approvalStatus = company.approvalStatus;
  }
  return data;
}

function issueSession(res, user, cookieName = 'fleetos_session') {
  const token = jwt.sign({ sub: String(user._id), role: user.role, sv: user.sessionVersion }, getJwtSecret(), { expiresIn: '12h' });
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200${secure ? '; Secure' : ''}`);
  return token;
}

function clearSession(res, cookieName = 'fleetos_session') {
  res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

function cookieValue(req, name) {
  const pair = String(req.headers.cookie || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : '';
}

function clientOrigin() {
  return String(process.env.CLIENT_ORIGIN || process.env.CORS_ORIGINS || 'http://localhost:5173').split(',')[0].trim();
}

function oauthConfig(provider, req) {
  const callbackBase = String(process.env.OAUTH_CALLBACK_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  if (provider === 'google') return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    idField: 'googleId',
    redirectUri: `${callbackBase}/api/auth/oauth/google/callback`,
  };
  if (provider === 'linkedin') return {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scope: 'openid profile email',
    idField: 'linkedinId',
    redirectUri: `${callbackBase}/api/auth/oauth/linkedin/callback`,
  };
  return null;
}

function oauthFailure(res, message) {
  return res.redirect(`${clientOrigin()}/login?oauth_error=${encodeURIComponent(message)}`);
}

async function authenticateCredentials(email, password) {
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() }).select('+password').populate('company');
  if (!user || !(await bcrypt.compare(String(password || ''), user.password))) return null;
  if (user.status !== 'active') {
    const error = new Error('This account is suspended');
    error.status = 403;
    throw error;
  }
  return user;
}

exports.register = async (req, res) => {
  const { name, ownerName, email, password, phone, address, city, role = 'customer', companyName, registrationNumber } = req.body;
  if (!['customer', 'company'].includes(role)) return res.status(400).json({ message: 'Only customer and company accounts can register publicly' });
  if (!email || !password || !(name || ownerName)) return res.status(400).json({ message: 'Name, email and password are required' });
  if (!passwordPattern.test(password)) return res.status(400).json({ message: 'Password must be at least 10 characters and include uppercase, lowercase, number and symbol' });
  if (await User.exists({ email: String(email).toLowerCase().trim() })) return res.status(409).json({ message: 'An account with this email already exists' });

  let logo = null;
  let businessLicense = null;
  if (role === 'company') {
    if (!req.body.logo || !req.body.businessLicense?.data) return res.status(400).json({ message: 'Company logo and business license are required' });
    logo = validateLogo(req.body.logo);
    businessLicense = validateBusinessLicense(req.body.businessLicense.data);
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: name || ownerName,
    email,
    password: hashed,
    phone: phone || '',
    address: address || '',
    city: city || '',
    role,
  });

  if (role === 'company') {
    if (!companyName || !city) {
      await User.deleteOne({ _id: user._id });
      return res.status(400).json({ message: 'Company name and city are required' });
    }
    let slug = slugify(companyName);
    if (await Company.exists({ slug })) slug = `${slug}-${String(user._id).slice(-6)}`;
    try {
      const company = await Company.create({
        name: companyName,
        slug,
        owner: user._id,
        registrationNumber: registrationNumber || '',
        email,
        phone: phone || '',
        location: address || '',
        city,
        logo: logo.data,
        businessLicense: {
          name: String(req.body.businessLicense.name || 'business-license').slice(0, 180),
          mimeType: businessLicense.mimeType,
          size: businessLicense.size,
          data: businessLicense.data,
          uploadedAt: new Date(),
        },
        approvalStatus: 'pending',
      });
      user.company = company._id;
      await user.save();
      await user.populate('company');
    } catch (error) {
      await User.deleteOne({ _id: user._id });
      throw error;
    }
  }

  if (role === 'company') broadcastPlatform('company-request');
  const token = issueSession(res, user);
  return res.status(201).json({ token, user: publicUser(user) });
};

exports.login = async (req, res) => {
  const user = await authenticateCredentials(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ message: 'Invalid email or password' });
  if (user.role === 'super-admin') return res.status(403).json({ message: 'Use the separate Super Admin console to sign in' });
  user.lastLoginAt = new Date();
  await user.save();
  const token = issueSession(res, user);
  return res.json({ token, user: publicUser(user) });
};

exports.startOAuth = async (req, res) => {
  const config = oauthConfig(req.params.provider, req);
  if (!config) return res.status(404).json({ message: 'OAuth provider not supported' });
  if (!config.clientId || !config.clientSecret) return res.status(503).json({ message: `${req.params.provider} OAuth is not configured` });
  const nonce = crypto.randomBytes(24).toString('base64url');
  const state = jwt.sign({ provider: req.params.provider, nonce }, getJwtSecret(), { expiresIn: '10m' });
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `fleetos_oauth_state=${nonce}; HttpOnly; Path=/api/auth/oauth; SameSite=Lax; Max-Age=600${secure ? '; Secure' : ''}`);
  const url = new URL(config.authorizationUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', state);
  if (req.params.provider === 'google') url.searchParams.set('prompt', 'select_account');
  return res.redirect(url.toString());
};

exports.finishOAuth = async (req, res) => {
  const provider = req.params.provider;
  const config = oauthConfig(provider, req);
  if (!config?.clientId || !config?.clientSecret) return oauthFailure(res, 'OAuth provider is not configured');
  try {
    if (req.query.error) return oauthFailure(res, 'Sign-in was cancelled');
    const state = jwt.verify(String(req.query.state || ''), getJwtSecret());
    if (state.provider !== provider || state.nonce !== cookieValue(req, 'fleetos_oauth_state')) return oauthFailure(res, 'OAuth session expired');
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(req.query.code || ''),
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    });
    const tokenResponse = await fetch(config.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: tokenBody });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) throw new Error('OAuth token exchange failed');
    const profileResponse = await fetch(config.userInfoUrl, { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.sub || !profile.email) throw new Error('OAuth profile did not include a verified email');
    const email = String(profile.email).toLowerCase().trim();
    let user = await User.findOne({ $or: [{ [config.idField]: String(profile.sub) }, { email }] }).populate('company');
    if (!user) {
      user = await User.create({
        name: profile.name || profile.given_name || email.split('@')[0],
        email,
        password: await bcrypt.hash(crypto.randomBytes(32).toString('base64url'), 12),
        role: 'customer',
        avatar: profile.picture || '',
        [config.idField]: String(profile.sub),
      });
    } else {
      if (user.status !== 'active') return oauthFailure(res, 'This account is suspended');
      user[config.idField] = String(profile.sub);
      if (!user.avatar && profile.picture) user.avatar = profile.picture;
      user.lastLoginAt = new Date();
      await user.save();
    }
    issueSession(res, user);
    res.append('Set-Cookie', 'fleetos_oauth_state=; HttpOnly; Path=/api/auth/oauth; SameSite=Lax; Max-Age=0');
    return res.redirect(`${clientOrigin()}/customer/dashboard?oauth=${provider}`);
  } catch (error) {
    console.error(`OAuth ${provider} callback failed: ${error.message}`);
    return oauthFailure(res, 'Unable to complete social sign-in');
  }
};

exports.logout = async (req, res) => {
  clearSession(res);
  return res.status(204).end();
};

exports.getCurrentUser = async (req, res) => res.json({ user: publicUser(req.user) });

exports.updateProfile = async (req, res) => {
  const updates = pick(req.body, ['name', 'phone', 'address', 'city', 'avatar', 'plan']);
  Object.assign(req.user, updates);
  await req.user.save();
  return res.json({ user: publicUser(req.user) });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!passwordPattern.test(String(newPassword || ''))) return res.status(400).json({ message: 'New password does not meet the security requirements' });
  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(String(currentPassword || ''), user.password))) return res.status(400).json({ message: 'Current password is incorrect' });
  user.password = await bcrypt.hash(newPassword, 12);
  user.sessionVersion += 1;
  await user.save();
  await user.populate('company');
  const token = issueSession(res, user);
  return res.json({ token, message: 'Password changed successfully' });
};

exports.getBookingDraft = async (req, res) => {
  const user = await User.findById(req.user._id).select('+bookingDraft');
  return res.json({ draft: user.bookingDraft || null });
};

exports.saveBookingDraft = async (req, res) => {
  const draft = req.body && typeof req.body === 'object' ? req.body : null;
  await User.updateOne({ _id: req.user._id }, { bookingDraft: draft });
  return res.json({ draft });
};

exports.authenticateCredentials = authenticateCredentials;
exports.issueSession = issueSession;
exports.clearSession = clearSession;
exports.publicUser = publicUser;
