const router = require('express').Router();
const controller = require('../controllers/paymentController');
const { protect, requireRole, requireApprovedCompany } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.get('/payments', protect, requireRole('customer', 'company'), (req, res, next) => req.user.role === 'company' ? requireApprovedCompany(req, res, next) : next(), asyncHandler(controller.getPayments));
router.post('/bookings/:bookingId/payment', protect, requireApprovedCompany, asyncHandler(controller.recordPayment));
router.post('/payments/checkout/:bookingId', protect, requireRole('customer'), asyncHandler(controller.createCardCheckout));

module.exports = router;
