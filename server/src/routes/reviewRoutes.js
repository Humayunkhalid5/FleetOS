const router = require('express').Router();
const controller = require('../controllers/reviewController');
const { protect, requireRole, requireApprovedCompany } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.get('/reviews/company/:companyId', asyncHandler(controller.getCompanyReviews));
router.post('/reviews', protect, requireRole('customer'), asyncHandler(controller.createReview));
router.get('/reviews', protect, (req, res, next) => req.user.role === 'company' ? requireApprovedCompany(req, res, next) : next(), asyncHandler(controller.getMyReviews));
router.put('/reviews/:id/reply', protect, requireApprovedCompany, asyncHandler(controller.replyToReview));

module.exports = router;
