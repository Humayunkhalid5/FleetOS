const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Booking = require('./models/Booking');
const { getJwtSecret } = require('./config/security');

let io;

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
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = cookieValue(socket.request.headers.cookie, 'fleetos_session') || socket.handshake.auth?.token;
      const payload = jwt.verify(token, getJwtSecret());
      const user = await User.findById(payload.sub);
      if (!user || user.status !== 'active' || user.sessionVersion !== payload.sv || user.role === 'super-admin') throw new Error('Invalid session');
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication required'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-booking', async (bookingId) => {
      const booking = await canAccessBooking(socket.user, bookingId);
      if (!booking) return socket.emit('booking:error', { message: 'Booking not found' });
      socket.join(`booking:${booking._id}`);
      socket.emit('tracking:snapshot', { bookingId: booking._id, status: booking.status, tracking: booking.tracking, technician: booking.technician });
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

module.exports = { initSocket, broadcastTracking };
