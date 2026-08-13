const ChatMessage = require('../models/ChatMessage');

// @desc   Get all active chat conversations (for company view)
// @route  GET /api/chats/conversations
exports.getConversations = async (req, res) => {
  try {
    const { companyId } = req.query;
    const targetCompanyId = companyId || req.user?.companyId || req.user?._id;

    let query = {};
    if (targetCompanyId) {
      query = {
        $or: [
          { roomId: targetCompanyId },
          { recipient: targetCompanyId },
        ],
      };
    }

    const allMessages = await ChatMessage.find(query);
    const rooms = {};
    for (const msg of allMessages) {
      const room = msg.roomId || 'general';
      if (!rooms[room] || new Date(msg.createdAt) > new Date(rooms[room].lastMessage.createdAt)) {
        rooms[room] = {
          roomId: room,
          clientName: msg.senderName || (msg.senderRole === 'customer' ? msg.sender : 'Client'),
          lastMessage: msg,
        };
      }
    }
    return res.json({ conversations: Object.values(rooms) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Get chat messages for a room or company
// @route  GET /api/chats/:bookingId/messages
exports.getChatMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const messages = await ChatMessage.find({
      $or: [
        { roomId: bookingId },
        { recipient: bookingId },
      ],
    });
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
    const { text, recipient, senderRole, senderName } = req.body;
    if (!bookingId || !text) {
      return res.status(400).json({ message: 'bookingId and text are required' });
    }

    const sRole = senderRole || req.user?.role || 'customer';
    const sName = senderName || req.user?.name || (sRole === 'company' ? 'Company Manager' : 'Customer');

    const message = await ChatMessage.create({
      roomId: bookingId,
      sender: req.user?._id ? req.user._id.toString() : (sRole === 'company' ? 'company' : 'customer'),
      senderName: sName,
      senderRole: sRole,
      recipient: recipient || (sRole === 'company' ? 'customer' : bookingId),
      recipientRole: sRole === 'company' ? 'customer' : 'company',
      text,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({ message });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
