// @desc   Get all active chat conversations (for dealer/company view)
// @route  GET /api/chats/conversations
exports.getConversations = async (req, res) => {
  try {
    const allMessages = await ChatMessage.find();
    const rooms = {};
    for (const msg of allMessages) {
      const room = msg.roomId || 'swiftfleet';
      if (!rooms[room] || new Date(msg.createdAt) > new Date(rooms[room].lastMessage.createdAt)) {
        rooms[room] = {
          roomId: room,
          lastMessage: msg,
        };
      }
    }
    return res.json({ conversations: Object.values(rooms) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

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
    const { text, recipient, senderRole } = req.body;
    if (!bookingId || !text) {
      return res.status(400).json({ message: 'bookingId and text are required' });
    }

    const message = await ChatMessage.create({
      roomId: bookingId,
      sender: req.user?._id || (senderRole === 'company' ? 'company' : 'customer'),
      senderRole: senderRole || req.user?.role || 'customer',
      recipient: recipient || (senderRole === 'company' ? 'customer' : bookingId),
      recipientRole: senderRole === 'company' ? 'customer' : 'company',
      text,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({ message });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

