const router = require('express').Router();
const controller = require('../controllers/copilotController');
const { protect, requireApprovedCompany } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.post('/copilot/query', protect, requireApprovedCompany, asyncHandler(controller.processCopilotMessage));
router.post('/copilot/action', protect, requireApprovedCompany, asyncHandler(controller.executeCopilotAction));

module.exports = router;
