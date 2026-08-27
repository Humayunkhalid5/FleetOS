const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Booking = require('./models/Booking');
const { getJwtSecret } = require('./config/security');

let io;
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174')
  .split(',')
  .map((origin) => origin.trim());
const isAllowedOrigin = (origin) => allowedOrigins.includes(origin)
  || (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):51\d\d$/.test(String(origin || '')));

function cookieValue(header, name) {
  const pair = String(header || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

async function canAccessBooking(user, bookingId) {
  if (user.role === 'customer') return Booking.findOne({ _id: bookingId, customer: user._id }).populate('technician', 'name phone avatar status');
  if (user.role === 'company') return Booking.findOne({ _id: bookingId, company: user.company }).populate('technician', 'name phone avatar status');
  return null;
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed'));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || cookieValue(socket.request.headers.cookie, 'fleetos_session');
      const payload = jwt.verify(token, getJwtSecret());
      const user = await User.findById(payload.sub);
      if (!user || user.status !== 'active' || user.sessionVersion !== payload.sv) throw new Error('Invalid session');
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication required'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.user.role === 'company' && socket.user.company) socket.join(`company:${socket.user.company}`);
    if (socket.user.role === 'customer') {
      socket.join(`customer:${socket.user._id}`);
      socket.join('marketplace');
    }
    if (socket.user.role === 'super-admin') socket.join('super-admins');
    socket.on('join-booking', async (bookingId) => {
      const booking = await canAccessBooking(socket.user, bookingId);
      if (!booking) return socket.emit('booking:error', { message: 'Booking not found' });
      socket.join(`booking:${booking._id}`);
      socket.emit('tracking:snapshot', {
        bookingId: booking._id,
        status: booking.status,
        tracking: { ...(booking.tracking?.toObject?.() || booking.tracking || {}), reference: booking.reference, location: booking.location },
        technician: booking.technician,
      });
    });
    socket.on('leave-booking', (bookingId) => socket.leave(`booking:${bookingId}`));
  });

  httpServer.on('listening', () => {
    const app = httpServer.listeners('request')[0];
    if (app?.set) app.set('io', io);
  });
  return io;
}

function broadcastTracking(booking) {
  if (io && booking) io.to(`booking:${booking._id}`).emit('tracking:update', { bookingId: booking._id, status: booking.status, tracking: booking.tracking });
}

function broadcastBooking(booking, event = 'booking:updated') {
  if (!io || !booking) return;
  const payload = { bookingId: String(booking._id), reference: booking.reference, status: booking.status };
  const companyId = booking.company?._id || booking.company;
  const customerId = booking.customer?._id || booking.customer;
  if (companyId) io.to(`company:${companyId}`).emit(event, payload);
  if (customerId) io.to(`customer:${customerId}`).emit(event, payload);
  io.to('super-admins').emit('platform:updated', { type: 'booking', ...payload });
}

function broadcastPlatform(type = 'platform') {
  if (io) io.to('super-admins').emit('platform:updated', { type });
}

function broadcastMarketplace(type = 'marketplace', companyId = null) {
  if (!io) return;
  io.to('marketplace').emit('marketplace:updated', { type, companyId: companyId ? String(companyId) : null });
  io.to('super-admins').emit('platform:updated', { type, companyId: companyId ? String(companyId) : null });
}

module.exports = { initSocket, broadcastTracking, broadcastBooking, broadcastPlatform, broadcastMarketplace };
