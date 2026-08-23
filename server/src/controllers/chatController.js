const Booking = require('../models/Booking');
const ChatMessage = require('../models/ChatMessage');

async function authorizedBooking(req, bookingId) {
  const filter = req.user.role === 'customer'
    ? { _id: bookingId, customer: req.user._id }
    : { _id: bookingId, company: req.user.company?._id || req.user.company };
  return Booking.findOne(filter);
}

exports.getConversations = async (req, res) => {
  const filter = req.user.role === 'customer' ? { customer: req.user._id } : { company: req.user.company?._id || req.user.company };
  const bookings = await Booking.find(filter).populate('company', 'name logo').sort({ updatedAt: -1 }).lean();
  const conversations = await Promise.all(bookings.map(async (booking) => {
    const lastMessage = await ChatMessage.findOne({ booking: booking._id }).sort({ createdAt: -1 }).lean();
    return { booking, lastMessage };
  }));
  return res.json({ conversations });
};

exports.getChatMessages = async (req, res) => {
  const booking = await authorizedBooking(req, req.params.bookingId);
  if (!booking) return res.status(404).json({ message: 'Conversation not found' });
  const messages = await ChatMessage.find({ booking: booking._id }).populate('sender', 'name avatar role').sort({ createdAt: 1 }).lean();
  return res.json({ booking, messages });
};

exports.sendChatMessage = async (req, res) => {
  const booking = await authorizedBooking(req, req.params.bookingId);
  if (!booking || !booking.customer) return res.status(404).json({ message: 'Conversation not found' });
  const text = String(req.body.text || req.body.message || '').trim();
  if (!text) return res.status(400).json({ message: 'Message cannot be empty' });
  const message = await ChatMessage.create({
    booking: booking._id,
    company: booking.company,
    customer: booking.customer,
    sender: req.user._id,
    senderRole: req.user.role,
    text,
  });
  const io = req.app.get('io');
  if (io) io.to(`booking:${booking._id}`).emit('chat:message', message);
  return res.status(201).json({ message });
};
