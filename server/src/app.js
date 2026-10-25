require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');
const paymentController = require('./controllers/paymentController');
const { compressJson } = require('./utils/compression');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174')
  .split(',')
  .map((origin) => origin.trim());
const isAllowedOrigin = (origin) => allowedOrigins.includes(origin)
  || (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):51\d\d$/.test(String(origin || '')));

app.disable('x-powered-by');
const rateBuckets = new Map();
const isProduction = process.env.NODE_ENV === 'production';
// `failuresOnly` limiters count a request only when it is rejected (4xx), so
// correct sign-ins never use up the allowance and one person's typos cannot
// lock out other accounts that share the same IP (every local portal does).
function rateLimit({ windowMs, max, scope, key = (req) => req.ip, failuresOnly = false, message = 'Too many requests; please try again shortly' }) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${scope}:${key(req)}`;
    const current = rateBuckets.get(bucketKey);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    rateBuckets.set(bucketKey, bucket);
    if (bucket.count >= max) {
      const minutes = Math.max(1, Math.ceil((bucket.resetAt - now) / 60_000));
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ message: `${message} Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` });
    }
    if (failuresOnly) res.on('finish', () => { if (res.statusCode >= 400 && res.statusCode < 500 && res.statusCode !== 429) bucket.count += 1; });
    else bucket.count += 1;
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - bucket.count));
    res.setHeader('RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));
    return next();
  };
}
// Drop expired buckets so the map does not grow forever.
setInterval(() => { const now = Date.now(); rateBuckets.forEach((bucket, key) => { if (bucket.resetAt <= now) rateBuckets.delete(key); }); }, 5 * 60_000).unref();
const signInKey = (req) => `${req.ip}:${String(req.body?.email || '').toLowerCase().trim()}`;

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed'));
  },
}));
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, res, next) => {
  Promise.resolve(paymentController.stripeWebhook(req, res)).catch(next);
});
app.use(express.json({ limit: '10mb' }));
app.use('/api', compressJson);
app.use('/api', rateLimit({ windowMs: 60_000, max: isProduction ? 300 : 3000, scope: 'api' }));
app.use(['/api/auth/login', '/api/admin/auth/login', '/api/admin/auth/change-password'], rateLimit({
  windowMs: 15 * 60_000, max: isProduction ? 10 : 25, scope: 'sign-in', key: signInKey, failuresOnly: true,
  message: 'Too many incorrect sign-in attempts for this email.',
}));
app.use('/api/auth/register', rateLimit({ windowMs: 15 * 60_000, max: 15, scope: 'register' }));

app.get('/api/health', (req, res) => res.json({
  status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded',
  mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  database: mongoose.connection.name || 'fleetos',
  timestamp: new Date().toISOString(),
}));

app.use('/api', require('./routes/authRoutes'));
app.use('/api', require('./routes/companyRoutes'));
app.use('/api', require('./routes/bookingRoutes'));
app.use('/api', require('./routes/reviewRoutes'));
app.use('/api', require('./routes/trackingRoutes'));
app.use('/api', require('./routes/chatRoutes'));
app.use('/api', require('./routes/assignmentRoutes'));
app.use('/api', require('./routes/inventoryRoutes'));
app.use('/api', require('./routes/serviceRoutes'));
app.use('/api', require('./routes/technicianRoutes'));
app.use('/api', require('./routes/customerRoutes'));
app.use('/api', require('./routes/paymentRoutes'));
app.use('/api', require('./routes/copilotRoutes'));
app.use('/api', require('./routes/invoiceRoutes'));
app.use('/api', require('./routes/notificationRoutes'));
app.use('/api/support', rateLimit({ windowMs: 15 * 60_000, max: 10, scope: 'support' }));
app.use('/api', require('./routes/supportRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use((req, res) => res.status(404).json({ message: 'Route not found', requestId: req.requestId }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || (error.code === 11000 ? 409 : (error.name === 'ValidationError' ? 400 : 500));
  if (status >= 500) console.error(`[${req.requestId}]`, error);
  return res.status(status).json({ message: status >= 500 ? 'Unexpected server error' : error.message, requestId: req.requestId });
});

module.exports = app;
