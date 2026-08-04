const express = require('express');
const { createBooking, getMyBookings, getBooking, updateBooking } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/bookings', createBooking);
router.get('/bookings', getMyBookings);
router.get('/bookings/:id', getBooking);
router.patch('/bookings/:id', updateBooking);

module.exports = router;

