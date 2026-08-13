const Technician = require('../models/Technician');

// @desc   Get technicians for a company
// @route  GET /api/technicians
exports.getTechnicians = async (req, res) => {
  try {
    const companyId = req.query.companyId || req.user?.companyId || req.user?.id;
    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }
    const technicians = await Technician.find({ companyId });
    return res.json({ technicians });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Create technician
// @route  POST /api/technicians
exports.createTechnician = async (req, res) => {
  try {
    const companyId = req.body.companyId || req.user?.companyId || req.user?.id;
    const { name, role, phone, email, rating, exp, status, avatar } = req.body;

    if (!companyId || !name) {
      return res.status(400).json({ message: 'Company ID and technician name are required' });
    }

    const techId = req.body.techId || `TECH-${Math.floor(100 + Math.random() * 900)}`;
    const technician = await Technician.create({
      companyId,
      techId,
      name,
      role: role || 'Specialist',
      phone: phone || '',
      email: email || '',
      rating: rating !== undefined ? Number(rating) : 0,
      exp: exp || '1 Year Exp.',
      status: status || 'Available',
      avatar: avatar || '',
    });

    return res.status(201).json({ technician });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Update technician
// @route  PUT /api/technicians/:id
exports.updateTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const technician = await Technician.findByIdAndUpdate(id, req.body);
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    return res.json({ technician });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Delete technician
// @route  DELETE /api/technicians/:id
exports.deleteTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    await Technician.findByIdAndDelete(id);
    return res.json({ message: 'Technician deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
