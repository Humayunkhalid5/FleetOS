const Booking = require('../models/Booking');
const ChatMessage = require('../models/ChatMessage');
const Company = require('../models/Company');
const Service = require('../models/Service');

async function authorizedBooking(req, bookingId) {
  const filter = req.user.role === 'customer'
    ? { _id: bookingId, customer: req.user._id }
    : { _id: bookingId, company: req.user.company?._id || req.user.company };
  return Booking.findOne(filter);
}

exports.getConversations = async (req, res) => {
  const filter = req.user.role === 'customer' ? { customer: req.user._id } : { company: req.user.company?._id || req.user.company };
  const bookings = await Booking.find(filter).populate('company', 'name logo slug').sort({ updatedAt: -1 }).lean();
  const conversations = await Promise.all(bookings.map(async (booking) => {
    const [lastMessage, unreadCount] = await Promise.all([
      ChatMessage.findOne({ booking: booking._id }).sort({ createdAt: -1 }).lean(),
      ChatMessage.countDocuments({ booking: booking._id, senderRole: { $ne: req.user.role }, readAt: null }),
    ]);
    return { booking, lastMessage, unreadCount };
  }));
  return res.json({ conversations });
};

exports.startCompanyConversation = async (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Only clients can start company chats' });
  const identifier = req.params.companyId;
  const filter = require('mongoose').isValidObjectId(identifier) ? { _id: identifier } : { slug: String(identifier).toLowerCase() };
  const company = await Company.findOne({ ...filter, approvalStatus: 'approved' }).lean();
  if (!company) return res.status(404).json({ message: 'Approved company not found' });

  let booking = await Booking.findOne({
    customer: req.user._id,
    company: company._id,
    'serviceSnapshot.name': 'General company inquiry',
    status: 'Pending',
  }).sort({ createdAt: -1 });

  if (!booking) {
    const service = await Service.findOne({ company: company._id, status: 'Active' }).sort({ name: 1 }).lean();
    booking = await Booking.create({
      reference: `FOS-CHAT-${Date.now().toString(36).toUpperCase()}`,
      customer: req.user._id,
      company: company._id,
      service: service?._id || null,
      serviceSnapshot: {
        name: service?.name || 'General company inquiry',
        category: service?.category || 'Inquiry',
        price: Number(service?.price || 0),
      },
      customerName: req.user.name,
      customerPhone: req.user.phone || '',
      customerEmail: req.user.email || '',
      vehicle: { label: 'Client inquiry' },
      pricing: { serviceTotal: 0, materialsTotal: 0, tax: 0, finalTotal: 0 },
      status: 'Pending',
      statusHistory: [{ status: 'Pending', at: new Date(), byRole: 'customer', note: 'Client started a company chat inquiry.' }],
      scheduledAt: new Date(),
      location: req.user.address || req.user.city || company.city || 'Pakistan',
      paymentMethod: 'cash',
    });
  }

  return res.status(201).json({ booking });
};

exports.getChatMessages = async (req, res) => {
  const booking = await authorizedBooking(req, req.params.bookingId);
  if (!booking) return res.status(404).json({ message: 'Conversation not found' });
  await ChatMessage.updateMany({ booking: booking._id, senderRole: { $ne: req.user.role }, readAt: null }, { $set: { readAt: new Date() } });
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
  await Booking.updateOne({ _id: booking._id }, { $set: { updatedAt: new Date() } });
  const io = req.app.get('io');
  if (io) {
    // A portal shell is subscribed at account level, while an open chat is
    // subscribed at booking level. Send to both so unread badges and open
    // conversations stay current without a page refresh.
    io.to(`booking:${booking._id}`).emit('chat:message', message);
    io.to(`company:${booking.company}`).emit('chat:message', message);
    io.to(`customer:${booking.customer}`).emit('chat:message', message);
  }
  return res.status(201).json({ message });
};
