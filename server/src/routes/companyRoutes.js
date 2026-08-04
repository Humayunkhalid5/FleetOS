const express = require('express');
const { getCompanies, getCompany } = require('../controllers/companyController');

const router = express.Router();

router.get('/companies', getCompanies);
router.get('/companies/:id', getCompany);

module.exports = router;

