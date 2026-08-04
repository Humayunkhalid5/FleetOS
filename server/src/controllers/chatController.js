const ChatMessage = require('../models/ChatMessage');

// @desc   Get chat messages for a room
// @route  GET /api/chats/:bookingId/messages
exports.getChatMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    // Use the route param as the room id — this is the company slug or booking id.
    const messages = await ChatMessage.find({ roomId: bookingId });
    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Send a chat message
// @route  POST /api/chats/:bookingId/messages
exports.sendChatMessage = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { text, recipient } = req.body;
    if (!bookingId || !text) {
      return res.status(400).json({ message: 'bookingId and text are required' });
    }

    const message = await ChatMessage.create({
      roomId: bookingId,
      sender: req.user?._id || 'customer',
      senderRole: req.user?.role || 'customer',
      recipient: recipient || bookingId,
      recipientRole: 'company',
      text,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({ message });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

