const router = require('express').Router();
const controller = require('../controllers/adminController');
const { protectAdmin, requireRole } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.post('/auth/login', asyncHandler(controller.adminLogin));
router.post('/auth/logout', asyncHandler(controller.adminLogout));
router.use(protectAdmin, requireRole('super-admin'));
router.get('/auth/me', asyncHandler(controller.adminMe));
router.get('/overview', asyncHandler(controller.overview));
router.get('/companies', asyncHandler(controller.listCompanies));
router.get('/requests', asyncHandler(controller.listRequests));
router.get('/reviews', asyncHandler(controller.listReviews));
router.get('/companies/:id/document', asyncHandler(controller.getCompanyDocument));
router.patch('/companies/:id/status', asyncHandler(controller.setCompanyStatus));
router.patch('/companies/:id/listing', asyncHandler(controller.setCompanyListing));
router.get('/users', asyncHandler(controller.listUsers));
router.patch('/users/:id/status', asyncHandler(controller.setUserStatus));
router.get('/bookings', asyncHandler(controller.listBookings));
router.get('/payments', asyncHandler(controller.listPayments));
router.get('/support', asyncHandler(controller.listSupport));
router.patch('/support/:id/status', asyncHandler(controller.setSupportStatus));
router.put('/settings', asyncHandler(controller.updateAdminProfile));

module.exports = router;
