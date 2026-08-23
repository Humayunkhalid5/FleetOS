const router = require('express').Router();
const controller = require('../controllers/bookingController');
const { protect, requireRole, requireApprovedCompany } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.use('/bookings', protect, requireRole('customer', 'company'));
router.use('/bookings', (req, res, next) => (
  req.user.role === 'company' ? requireApprovedCompany(req, res, next) : next()
));
router.post('/bookings', asyncHandler(controller.createBooking));
router.get('/bookings', asyncHandler(controller.getMyBookings));
router.get('/bookings/:id', asyncHandler(controller.getBooking));
router.patch('/bookings/:id', asyncHandler(controller.updateBooking));
router.put('/bookings/:id', asyncHandler(controller.updateBooking));

module.exports = router;
