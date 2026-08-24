const router = require('express').Router();
const controller = require('../controllers/chatController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.use('/chats', protect, requireRole('customer', 'company'));
router.get('/chats/conversations', asyncHandler(controller.getConversations));
router.post('/chats/company/:companyId/start', asyncHandler(controller.startCompanyConversation));
router.get('/chats/:bookingId/messages', asyncHandler(controller.getChatMessages));
router.post('/chats/:bookingId/messages', asyncHandler(controller.sendChatMessage));

module.exports = router;
