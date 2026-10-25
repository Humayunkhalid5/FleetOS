const SupportRequest = require('../models/SupportRequest');
const { broadcastPlatform } = require('../socket');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.createSupportRequest = async (req, res) => {
  const name = String(req.body.name || req.user?.name || '').trim();
  const email = String(req.body.email || req.user?.email || '').trim().toLowerCase();
  const message = String(req.body.message || '').trim();
  const topic = String(req.body.topic || 'General inquiry').trim().slice(0, 60);
  const subject = String(req.body.subject || topic).trim().slice(0, 160);
  if (!req.user && (!name || !emailPattern.test(email))) return res.status(400).json({ message: 'Enter your name and a valid email address' });
  if (message.length < 10) return res.status(400).json({ message: 'Tell us a little more — at least 10 characters' });
  const request = await SupportRequest.create({ createdBy: req.user?._id || null, contactName: name, contactEmail: email, topic, subject, message });
  broadcastPlatform('support');
  return res.status(201).json({ request: { _id: request._id, status: request.status, createdAt: request.createdAt } });
};
