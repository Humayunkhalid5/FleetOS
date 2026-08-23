const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Company = require('../models/Company');

async function updateCompanyRating(companyId) {
  const [summary] = await Review.aggregate([
    { $match: { company: companyId, published: true } },
    { $group: { _id: '$company', rating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
  ]);
  await Company.updateOne({ _id: companyId }, { rating: summary?.rating || 0, reviewCount: summary?.reviewCount || 0 });
}

exports.createReview = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.body.bookingId || req.body.booking, customer: req.user._id, status: { $in: ['Completed', 'Paid'] } });
  if (!booking) return res.status(404).json({ message: 'Completed booking not found' });
  if (await Review.exists({ booking: booking._id })) return res.status(409).json({ message: 'This booking has already been reviewed' });
  const review = await Review.create({
    customer: req.user._id,
    company: booking.company,
    booking: booking._id,
    rating: Number(req.body.rating),
    comment: String(req.body.comment || req.body.review || '').trim(),
  });
  await updateCompanyRating(booking.company);
  return res.status(201).json({ review });
};

exports.getMyReviews = async (req, res) => {
  const filter = req.user.role === 'customer' ? { customer: req.user._id } : { company: req.company._id };
  const reviews = await Review.find(filter).populate('customer', 'name avatar').populate('company', 'name logo').populate('booking', 'serviceSnapshot technician').sort({ createdAt: -1 }).lean();
  return res.json({ reviews });
};

exports.getCompanyReviews = async (req, res) => {
  const reviews = await Review.find({ company: req.params.companyId, published: true }).populate('customer', 'name avatar').sort({ createdAt: -1 }).lean();
  return res.json({ reviews });
};

exports.replyToReview = async (req, res) => {
  const text = String(req.body.reply || '').trim();
  if (!text) return res.status(400).json({ message: 'Reply is required' });
  const review = await Review.findOneAndUpdate({ _id: req.params.id, company: req.company._id }, { reply: { text, repliedAt: new Date() } }, { new: true });
  if (!review) return res.status(404).json({ message: 'Review not found' });
  return res.json({ review });
};
