const router = require('express').Router();
const controller = require('../controllers/trackingController');
const { protect, requireRole, requireApprovedCompany } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.get('/bookings/:id/tracking', protect, requireRole('customer', 'company'), asyncHandler(controller.getTracking));
router.patch('/bookings/:id/tracking', protect, requireApprovedCompany, asyncHandler(controller.updateTracking));

module.exports = router;
