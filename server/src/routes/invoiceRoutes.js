const router = require('express').Router();
const controller = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.get('/invoices', protect, asyncHandler(controller.getMyInvoices));
router.get('/invoices/booking/:bookingId', protect, asyncHandler(controller.getInvoiceByBooking));

module.exports = router;
