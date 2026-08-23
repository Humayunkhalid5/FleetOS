const router = require('express').Router();
const controller = require('../controllers/serviceController');
const { protect, optionalProtect, requireApprovedCompany } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.get('/services', optionalProtect, asyncHandler(controller.getServices));
router.post('/services', protect, requireApprovedCompany, asyncHandler(controller.createService));
router.put('/services/:id', protect, requireApprovedCompany, asyncHandler(controller.updateService));
router.delete('/services/:id', protect, requireApprovedCompany, asyncHandler(controller.deleteService));

module.exports = router;
