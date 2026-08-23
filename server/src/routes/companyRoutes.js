const router = require('express').Router();
const controller = require('../controllers/companyController');
const { protect, requireApprovedCompany } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.get('/companies', asyncHandler(controller.getCompanies));
router.get('/company/dashboard', protect, requireApprovedCompany, asyncHandler(controller.getCompanyDashboard));
router.put('/company/settings', protect, requireApprovedCompany, asyncHandler(controller.updateCompanySettings));
router.get('/companies/:id', asyncHandler(controller.getCompany));

module.exports = router;
