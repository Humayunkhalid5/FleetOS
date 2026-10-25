const router = require('express').Router();
const controller = require('../controllers/supportController');
const { optionalProtect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.post('/support', optionalProtect, asyncHandler(controller.createSupportRequest));

module.exports = router;
