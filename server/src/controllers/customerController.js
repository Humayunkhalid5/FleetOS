const Customer = require('../models/Customer');

// @desc   Get customers for a company
// @route  GET /api/customers
exports.getCustomers = async (req, res) => {
  try {
    const companyId = req.query.companyId || req.user?.companyId || req.user?.id;
    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }
    const customers = await Customer.find({ companyId });
    return res.json({ customers });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Create customer
// @route  POST /api/customers
exports.createCustomer = async (req, res) => {
  try {
    const companyId = req.body.companyId || req.user?.companyId || req.user?.id;
    const { name, contact, email, phone, address, totalSpent, status } = req.body;

    if (!companyId || !name) {
      return res.status(400).json({ message: 'Company ID and customer name are required' });
    }

    const customerId = req.body.customerId || `CUST-${Math.floor(100 + Math.random() * 900)}`;
    const customer = await Customer.create({
      companyId,
      customerId,
      name,
      contact: contact || name,
      email: email || '',
      phone: phone || '',
      address: address || '',
      totalJobs: 0,
      totalSpent: totalSpent || '$0.00',
      status: status || 'Active Account',
    });

    return res.status(201).json({ customer });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Update customer
// @route  PUT /api/customers/:id
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndUpdate(id, req.body);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    return res.json({ customer });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Delete customer
// @route  DELETE /api/customers/:id
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await Customer.findByIdAndDelete(id);
    return res.json({ message: 'Customer deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
