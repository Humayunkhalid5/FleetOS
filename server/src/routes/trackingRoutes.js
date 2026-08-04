const express = require('express');
const { getTracking, updateTracking } = require('../controllers/trackingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/bookings/:id/tracking', getTracking);
router.patch('/bookings/:id/tracking', updateTracking);

module.exports = router;

