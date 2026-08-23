const router = require('express').Router();
const controller = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.post('/auth/register', asyncHandler(controller.register));
router.post('/auth/login', asyncHandler(controller.login));
router.get('/auth/oauth/:provider', asyncHandler(controller.startOAuth));
router.get('/auth/oauth/:provider/callback', asyncHandler(controller.finishOAuth));
router.post('/auth/logout', asyncHandler(controller.logout));
router.get('/auth/me', protect, asyncHandler(controller.getCurrentUser));
router.put('/auth/profile', protect, asyncHandler(controller.updateProfile));
router.post('/auth/change-password', protect, asyncHandler(controller.changePassword));
router.get('/auth/booking-draft', protect, asyncHandler(controller.getBookingDraft));
router.put('/auth/booking-draft', protect, asyncHandler(controller.saveBookingDraft));

module.exports = router;
