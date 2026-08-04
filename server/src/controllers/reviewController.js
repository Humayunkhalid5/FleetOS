const Review = require('../models/Review');

// @desc   Create a review
// @route  POST /api/reviews
exports.createReview = async (req, res) => {
  try {
    const { bookingId, technician, service, rating, comment, photos } = req.body;

    if (!technician || !rating) {
      return res.status(400).json({ message: 'Please provide technician and rating' });
    }

    const review = await Review.create({
      user: req.user._id,
      booking: bookingId,
      technician,
      service: service || '',
      rating: Number(rating),
      comment: comment || '',
      photos: photos || [],
    });

    return res.status(201).json({ review });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Get logged-in user's reviews
// @route  GET /api/reviews
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json({ reviews });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Get reviews for a company
// @route  GET /api/reviews/company/:companyId
exports.getCompanyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ company: req.params.companyId }).sort({ createdAt: -1 });
    return res.json({ reviews });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

