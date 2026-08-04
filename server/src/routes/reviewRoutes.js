const express = require('express');
const { createReview, getMyReviews, getCompanyReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/reviews', createReview);
router.get('/reviews', getMyReviews);
router.get('/reviews/company/:companyId', getCompanyReviews);

module.exports = router;

