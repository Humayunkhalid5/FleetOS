const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Booking = require('./models/Booking');
const ChatMessage = require('./models/ChatMessage');
const { advanceBooking } = require('./services/trackingService');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // Simple auth middleware for socket connections
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Not authorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Not authorized'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id, 'user:', socket.userId);

    // Join a booking room to receive live tracking updates
    socket.on('join-booking', async (bookingId) => {
      if (!bookingId) return;
      socket.join(`booking:${bookingId}`);
      try {
        const booking = await Booking.findOne({
          _id: bookingId,
          user: socket.userId,
        }).populate('company', 'name slug logo');
        if (booking) {
          socket.emit('tracking:snapshot', buildTrackingPayload(booking));
        }
      } catch (err) {
        socket.emit('tracking:error', { message: err.message });
      }
    });

    socket.on('leave-booking', (bookingId) => {
      if (bookingId) socket.leave(`booking:${bookingId}`);
    });

    // ============ LIVE CHAT ============
    // Join a chat room (keyed by company id or booking id).
    socket.on('chat:join', async (roomId) => {
      if (!roomId) return;
      socket.join(`chat:${roomId}`);
      // Send existing history for this room
      try {
        const messages = await ChatMessage.find({ roomId });
        socket.emit('chat:history', { messages });
      } catch (err) {
        socket.emit('chat:error', { message: err.message });
      }
    });

    socket.on('chat:leave', (roomId) => {
      if (roomId) socket.leave(`chat:${roomId}`);
    });

    // Send a new chat message; persist it and broadcast to everyone in the room.
    socket.on('chat:message', async (payload) => {
      const roomId = payload?.roomId;
      const text = payload?.text;
      if (!roomId || !text) return;

      const message = await ChatMessage.create({
        roomId,
        sender: socket.userId || 'customer',
        senderRole: payload?.senderRole || 'customer',
        recipient: payload?.recipient || '',
        recipientRole: payload?.recipientRole || 'company',
        text,
        createdAt: new Date().toISOString(),
      });

      io.to(`chat:${roomId}`).emit('chat:message', { message });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  // Start the technician movement simulator
  startSimulator();

  return io;
};

// Build the payload the client uses to render the map
const buildTrackingPayload = (booking) => ({
  _id: booking._id,
  reference: booking.reference,
  service: booking.service,
  technician: booking.technician,
  vehicleLabel: booking.vehicleLabel,
  status: booking.status,
  tracking: booking.tracking,
  origin: booking.origin,
  destination: booking.destination,
  currentPosition: booking.currentPosition,
  company: booking.company,
  location: booking.location,
  scheduledDate: booking.scheduledDate,
  scheduledTime: booking.scheduledTime,
});

// Broadcast updated tracking to everyone in a booking room
const broadcastTracking = (booking) => {
  if (!io || !booking) return;
  const room = `booking:${booking._id}`;
  io.to(room).emit('tracking:update', buildTrackingPayload(booking));
};

// Simple simulator: every 4s advance all active (in-progress) bookings
let simulatorInterval = null;
const startSimulator = () => {
  if (simulatorInterval) clearInterval(simulatorInterval);
  simulatorInterval = setInterval(async () => {
    try {
      const activeBookings = await Booking.find({
        status: 'in-progress',
        'tracking.stage': { $nin: ['completed'] },
      }).limit(50);
      for (const booking of activeBookings) {
        const updated = await advanceBooking(booking);
        if (updated) broadcastTracking(updated);
      }
    } catch (err) {
      console.error('Simulator error:', err.message);
    }
  }, 4000);
};

module.exports = { initSocket, broadcastTracking };
