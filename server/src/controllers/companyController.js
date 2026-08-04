const Company = require('../models/Company');
const { filterCompaniesByLocation } = require('../utils/companyFilters');
const seedData = require('../data/seedData');

// @desc   Get all companies (optionally filter by location/area/city)
// @route  GET /api/companies
exports.getCompanies = async (req, res) => {
  try {
    const query = req.query.location || '';
    const area = req.query.area || '';
    const companies = await Company.find().sort('-rating');
    let filtered = filterCompaniesByLocation(companies, query);

    // Optional narrow-by-area filter (matches company.areas list)
    if (area) {
      const normalizedArea = area.trim().toLowerCase();
      filtered = filtered.filter((company) =>
        (company.areas || []).some((a) => a.toLowerCase().includes(normalizedArea))
      );
    }

    return res.json({
      companies: filtered,
      cities: Object.keys(seedData.areasByCity || {}),
      areasByCity: seedData.areasByCity || {},
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc   Get single company by id or slug
// @route  GET /api/companies/:id
exports.getCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    const company = isObjectId
      ? await Company.findById(id)
      : await Company.findOne({ slug: id });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    return res.json({ company });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

