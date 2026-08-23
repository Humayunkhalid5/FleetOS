const router = require('express').Router();
const controller = require('../controllers/customerController');
const { protect, requireApprovedCompany } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.use('/customers', protect, requireApprovedCompany);
router.get('/customers', asyncHandler(controller.getCustomers));
router.post('/customers', asyncHandler(controller.createCustomer));
router.put('/customers/:id', asyncHandler(controller.updateCustomer));
router.delete('/customers/:id', asyncHandler(controller.deleteCustomer));

module.exports = router;
