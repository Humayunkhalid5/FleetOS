const router = require('express').Router();
const controller = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.get('/notifications', protect, asyncHandler(controller.getMyNotifications));
router.patch('/notifications/read-all', protect, asyncHandler(controller.markAllAsRead));
router.patch('/notifications/:id/read', protect, asyncHandler(controller.markAsRead));

module.exports = router;
