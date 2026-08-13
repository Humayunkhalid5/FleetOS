const express = require('express');
const { getChatMessages, sendChatMessage, getConversations } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/chats/conversations', getConversations);
router.get('/chats/:bookingId/messages', getChatMessages);
router.post('/chats/:bookingId/messages', sendChatMessage);

module.exports = router;
