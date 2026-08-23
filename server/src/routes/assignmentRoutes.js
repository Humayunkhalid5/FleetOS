const router = require('express').Router();
const controller = require('../controllers/assignmentController');
const { protect, requireApprovedCompany } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.post('/bookings/:id/assign', protect, requireApprovedCompany, asyncHandler(controller.assignTechnician));
router.post('/assign-technician', protect, requireApprovedCompany, asyncHandler(controller.assignTechnician));

module.exports = router;
