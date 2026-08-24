const crypto = require('crypto');
const Technician = require('../models/Technician');
const Booking = require('../models/Booking');
const { pick } = require('../utils/http');
const { validateAvatar } = require('../utils/uploads');

exports.getTechnicians = async (req, res) => res.json({ technicians: await Technician.find({ company: req.company._id }).sort({ name: 1 }).lean() });

exports.createTechnician = async (req, res) => {
  const data = pick(req.body, ['name', 'role', 'phone', 'email', 'rating', 'experienceYears', 'status', 'avatar']);
  if (data.avatar) data.avatar = validateAvatar(data.avatar).data;
  const technician = await Technician.create({ ...data, company: req.company._id, techId: `TECH-${crypto.randomInt(100000, 999999)}` });
  return res.status(201).json({ technician });
};

exports.updateTechnician = async (req, res) => {
  const updates = pick(req.body, ['name', 'role', 'phone', 'email', 'rating', 'experienceYears', 'status', 'avatar']);
  if (updates.avatar) updates.avatar = validateAvatar(updates.avatar).data;
  const technician = await Technician.findOneAndUpdate({ _id: req.params.id, company: req.company._id }, updates, { new: true, runValidators: true });
  if (!technician) return res.status(404).json({ message: 'Technician not found' });
  return res.json({ technician });
};

exports.deleteTechnician = async (req, res) => {
  const active = await Booking.exists({ technician: req.params.id, company: req.company._id, status: { $in: ['Assigned', 'En Route', 'Arrived', 'In Progress'] } });
  if (active) return res.status(409).json({ message: 'Technician cannot be deleted while assigned to an active booking' });
  const technician = await Technician.findOneAndDelete({ _id: req.params.id, company: req.company._id });
  if (!technician) return res.status(404).json({ message: 'Technician not found' });
  return res.status(204).end();
};
