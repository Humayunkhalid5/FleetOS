const Service = require('../models/Service');

// @desc   Get services for a company
// @route  GET /api/services
exports.getServices = async (req, res) => {
  try {
    const companyId = req.query.companyId || req.user?.companyId || req.user?.id;
    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }
    const services = await Service.find({ companyId });
    return res.json({ services });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Create service
// @route  POST /api/services
exports.createService = async (req, res) => {
  try {
    const companyId = req.body.companyId || req.user?.companyId || req.user?.id;
    const { name, category, price, duration, status, description } = req.body;

    if (!companyId || !name) {
      return res.status(400).json({ message: 'Company ID and service name are required' });
    }

    const serviceId = req.body.serviceId || `SVC-${Math.floor(200 + Math.random() * 800)}`;
    const service = await Service.create({
      companyId,
      serviceId,
      name,
      category: category || 'Mechanical',
      price: Number(price) || 0,
      duration: duration || '1 Hour',
      status: status || 'Active',
      description: description || '',
    });

    return res.status(201).json({ service });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Update service
// @route  PUT /api/services/:id
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findByIdAndUpdate(id, req.body);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    return res.json({ service });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Delete service
// @route  DELETE /api/services/:id
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    await Service.findByIdAndDelete(id);
    return res.json({ message: 'Service deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
