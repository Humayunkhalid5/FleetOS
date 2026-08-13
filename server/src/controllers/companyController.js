const Company = require('../models/Company');
const User = require('../models/User');
const Service = require('../models/Service');
const Technician = require('../models/Technician');
const { filterCompaniesByLocation } = require('../utils/companyFilters');
const seedData = require('../data/seedData');

const extractCity = (address = '') => {
  if (!address) return '';
  const parts = address.split(',').map((s) => s.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 2] || parts[0];
  }
  return parts[0] || '';
};

// @desc   Get all companies (optionally filter by location/area/city)
// @route  GET /api/companies
exports.getCompanies = async (req, res) => {
  try {
    const query = req.query.location || '';
    const area = req.query.area || '';
    
    // 1. Fetch companies from Company model
    let companies = await Company.find().sort('-rating');
    if (!Array.isArray(companies)) companies = [];

    // 2. Fetch registered company users from User model
    let companyUsers = [];
    try {
      companyUsers = await User.find({ role: 'company' });
      if (!Array.isArray(companyUsers)) companyUsers = [];
    } catch (e) {}

    // Combine user-registered companies if not already present in Company collection
    for (const u of companyUsers) {
      const uSlug = u.companyId || (u.companyName || u.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const exists = companies.some(
        (c) => (c._id && c._id.toString() === u._id.toString()) || c.slug === uSlug || (c.name && c.name.toLowerCase() === (u.companyName || u.name || '').toLowerCase())
      );
      if (!exists && (u.companyName || u.name)) {
        companies.push({
          _id: u._id,
          name: u.companyName || u.name,
          slug: uSlug,
          description: u.description || 'Registered SaaS Fleet & Service Provider',
          rating: Number(u.rating) || 0,
          reviewCount: Number(u.reviewCount) || 0,
          heroImage: u.heroImage || u.avatar || '',
          logo: u.avatar || '',
          location: u.address || u.location || '',
          city: u.city || extractCity(u.address),
          phone: u.phone || '',
          email: u.email || '',
          services: [],
          technicians: [],
        });
      }
    }

    // 3. For each company, populate live dynamic services & technicians
    const populated = await Promise.all(
      companies.map(async (c) => {
        const compObj = c.toObject ? c.toObject() : { ...c };
        const idsToMatch = [compObj._id ? compObj._id.toString() : null, compObj.slug, compObj.companyId].filter(Boolean);

        let dynamicServices = [];
        let dynamicTechs = [];

        for (const cid of idsToMatch) {
          try {
            const svcs = await Service.find({ companyId: cid });
            if (Array.isArray(svcs) && svcs.length > 0) {
              dynamicServices = svcs;
              break;
            }
          } catch (e) {}
        }

        for (const cid of idsToMatch) {
          try {
            const techs = await Technician.find({ companyId: cid });
            if (Array.isArray(techs) && techs.length > 0) {
              dynamicTechs = techs;
              break;
            }
          } catch (e) {}
        }

        return {
          ...compObj,
          services: dynamicServices.length > 0 ? dynamicServices : (compObj.services || []),
          technicians: dynamicTechs.length > 0 ? dynamicTechs : (compObj.technicians || []),
        };
      })
    );

    let filtered = filterCompaniesByLocation(populated, query);

    // Optional narrow-by-area filter
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

    let company = isObjectId
      ? await Company.findById(id)
      : await Company.findOne({ slug: id });

    if (!company) {
      // Check in User collection for role 'company'
      const userComp = isObjectId
        ? await User.findById(id)
        : await User.findOne({ $or: [{ companyId: id }, { companyName: new RegExp(`^${id}$`, 'i') }] });

      if (userComp && userComp.role === 'company') {
        const uSlug = userComp.companyId || (userComp.companyName || userComp.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        company = {
          _id: userComp._id,
          name: userComp.companyName || userComp.name,
          slug: uSlug,
          description: userComp.description || 'Registered SaaS Fleet & Service Provider',
          rating: Number(userComp.rating) || 0,
          reviewCount: Number(userComp.reviewCount) || 0,
          heroImage: userComp.heroImage || userComp.avatar || '',
          logo: userComp.avatar || '',
          location: userComp.address || userComp.location || '',
          city: userComp.city || extractCity(userComp.address),
          phone: userComp.phone || '',
          email: userComp.email || '',
          services: [],
          technicians: [],
        };
      }
    }

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const compObj = company.toObject ? company.toObject() : { ...company };
    const idsToMatch = [compObj._id ? compObj._id.toString() : null, compObj.slug, compObj.companyId, id].filter(Boolean);

    let dynamicServices = [];
    let dynamicTechs = [];

    for (const cid of idsToMatch) {
      try {
        const svcs = await Service.find({ companyId: cid });
        if (Array.isArray(svcs) && svcs.length > 0) {
          dynamicServices = svcs;
          break;
        }
      } catch (e) {}
    }

    for (const cid of idsToMatch) {
      try {
        const techs = await Technician.find({ companyId: cid });
        if (Array.isArray(techs) && techs.length > 0) {
          dynamicTechs = techs;
          break;
        }
      } catch (e) {}
    }

    const finalCompany = {
      ...compObj,
      services: dynamicServices.length > 0 ? dynamicServices : (compObj.services || []),
      technicians: dynamicTechs.length > 0 ? dynamicTechs : (compObj.technicians || []),
    };

    return res.json({ company: finalCompany });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
<<<<<<< HEAD
  
=======
>>>>>>> origin/aisha
