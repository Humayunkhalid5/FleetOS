const Company = require('../models/Company');
const Service = require('../models/Service');
const Inventory = require('../models/Inventory');
const Technician = require('../models/Technician');
const User = require('../models/User');
const { categoryOf } = require('../config/companyWorkspace');
const { coverCategory, coverImageFor } = require('./coverImages');

// Development data only. Gives the demonstration marketplace one realistic
// business of every kind in each city, with a catalogue that fits the trade.
// Real registrations (anything not on @fleetos.local) are never touched.
const CATALOGUE_VERSION = 2;

// Older development databases kept a second, renamed copy of the city
// catalogue. Those copies become the industries the four generated brands
// do not cover, rotated so every city gets a different mix.
const SHOWCASE_BRANDS = [
  ['Game Zone', 'electronics-gaming', 'Consoles, video games, phones and same-day device repairs.', ['Gaming Advisor', 'Repair Technician', 'Delivery Rider']],
  ['Glow Salon & Spa', 'health-beauty', 'Hair, skin, spa treatments and bridal makeup by certified stylists.', ['Senior Stylist', 'Beautician', 'Spa Therapist']],
  ['Spice Kitchen', 'food-hospitality', 'Fresh biryani, karahi and fast food, delivered hot or ready for pickup.', ['Head Chef', 'Kitchen Staff', 'Delivery Rider']],
  ['Fresh Mart', 'retail-products', 'Groceries and household essentials delivered to your door.', ['Store Manager', 'Packer', 'Delivery Rider']],
  ['Care Pharmacy & Clinic', 'healthcare', 'Doctor consultations, home lab tests and medicine delivery.', ['General Physician', 'Pharmacist', 'Phlebotomist']],
  ['Auto Care', 'auto-services', 'Car servicing, oil changes, car wash and roadside help.', ['Senior Mechanic', 'Auto Electrician', 'Detailer']],
  ['Learning Academy', 'education', 'Home tuition, online classes and test preparation.', ['Maths Tutor', 'Science Tutor', 'English Trainer']],
  ['Swift Couriers & Movers', 'logistics', 'Same-day parcels, intercity delivery and house shifting.', ['Courier', 'Truck Driver', 'Loader']],
  ['Event Studio', 'events', 'Wedding photography, decor, and sound and lighting for every occasion.', ['Lead Photographer', 'Decorator', 'Sound Engineer']],
  ['Power & Gas', 'oil-energy', 'LPG refills, solar installation and generator service.', ['Solar Engineer', 'Gas Technician', 'Delivery Rider']],
];

const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const SEEDED = { $or: [{ email: /@fleetos\.local$/ }, { seedProfileVersion: { $gte: 1 } }] };

async function bulk(Model, operations) {
  for (let start = 0; start < operations.length; start += 1000) {
    // eslint-disable-next-line no-await-in-loop
    await Model.bulkWrite(operations.slice(start, start + 1000), { ordered: false });
  }
}

async function seedIndustries({ generatedSlugs = [] } = {}) {
  const pending = await Company.find({ ...SEEDED, $and: [{ $or: [{ seedProfileVersion: { $exists: false } }, { seedProfileVersion: { $lt: CATALOGUE_VERSION } }] }] })
    .select('+seedProfileVersion name slug city location businessCategory owner email')
    .lean();
  if (!pending.length) return;
  const keep = new Set(generatedSlugs);
  const takenSlugs = new Set((await Company.find({}, 'slug').lean()).map((company) => company.slug));

  // 1. Repurpose the legacy duplicates (not part of today's generated catalogue).
  const legacy = pending.filter((company) => !keep.has(company.slug) && /@fleetos\.local$/.test(company.email || ''));
  const byCity = new Map();
  legacy.forEach((company) => { if (!byCity.has(company.city)) byCity.set(company.city, []); byCity.get(company.city).push(company); });
  const companyOps = [];
  const ownerOps = [];
  const staffRoles = new Map();
  [...byCity.keys()].sort().forEach((city, cityIndex) => {
    byCity.get(city).sort((a, b) => a.slug.localeCompare(b.slug)).forEach((company, index) => {
      const [brand, businessCategory, description, roles] = SHOWCASE_BRANDS[(cityIndex * 4 + index) % SHOWCASE_BRANDS.length];
      const name = `${city} ${brand}`;
      let slug = slugify(name);
      if (takenSlugs.has(slug) && slug !== company.slug) slug = `${slug}-${String(company._id).slice(-4)}`;
      takenSlugs.delete(company.slug);
      takenSlugs.add(slug);
      Object.assign(company, { name, slug, businessCategory });
      staffRoles.set(String(company._id), roles);
      companyOps.push({ updateOne: { filter: { _id: company._id }, update: { $set: { name, slug, businessCategory, description, fulfillmentOptions: [], heroImage: coverImageFor(businessCategory, slug, name) } } } });
      if (company.owner) ownerOps.push({ updateOne: { filter: { _id: company.owner, email: /@fleetos\.local$/ }, update: { $set: { name: `${name} Owner`, email: `owner.${slug}@fleetos.local` } } } });
    });
  });

  // 2. Every other demo company gets a category if it never had one.
  pending.filter((company) => !staffRoles.has(String(company._id))).forEach((company) => {
    const businessCategory = company.businessCategory || coverCategory(undefined, company.name);
    company.businessCategory = businessCategory;
    companyOps.push({ updateOne: { filter: { _id: company._id }, update: { $set: { businessCategory } } } });
  });
  await bulk(Company, companyOps);
  if (ownerOps.length) await bulk(User, ownerOps).catch((error) => console.warn(`Owner email refresh skipped: ${error.message}`));

  // 3. Catalogue, stock and staff roles that fit each business.
  const serviceOps = [];
  const inventoryOps = [];
  const staffOps = [];
  pending.forEach((company) => {
    const category = categoryOf(company.businessCategory);
    category.starter.forEach(([name, offeringCategory, price, durationMinutes, kind, unit, description], index) => {
      const serviceId = `SVC-${index + 1}`;
      serviceOps.push({ updateOne: { filter: { company: company._id, serviceId }, update: { $set: { name, category: offeringCategory, price, durationMinutes, kind, unit, description, status: 'Active' }, $setOnInsert: { company: company._id, serviceId } }, upsert: true } });
    });
    for (let index = category.starter.length; index < 10; index += 1) {
      serviceOps.push({ updateOne: { filter: { company: company._id, serviceId: `SVC-${index + 1}` }, update: { $set: { status: 'Inactive' } } } });
    }
    if (category.modules.inventory !== false) {
      category.stock.forEach(([sku, name, stockCategory, quantity, reorderLevel, unitCost]) => {
        inventoryOps.push({ updateOne: { filter: { company: company._id, sku }, update: { $setOnInsert: { company: company._id, sku, name, category: stockCategory, quantity, reorderLevel, unitCost, unitPrice: Math.round(unitCost * 1.2), warehouse: `${company.city} Main` } }, upsert: true } });
      });
    }
    const roles = staffRoles.get(String(company._id));
    if (roles) roles.forEach((role, index) => staffOps.push({ updateOne: { filter: { company: company._id, techId: `TECH-${index + 1}` }, update: { $set: { role, skills: [role, ...category.examples.slice(0, 2)] } } } }));
  });
  await bulk(Service, serviceOps);
  if (inventoryOps.length) await bulk(Inventory, inventoryOps);
  if (staffOps.length) await bulk(Technician, staffOps);
  await Company.updateMany({ _id: { $in: pending.map((company) => company._id) } }, { $set: { seedProfileVersion: CATALOGUE_VERSION } });

  const counts = pending.reduce((map, company) => ({ ...map, [company.businessCategory]: (map[company.businessCategory] || 0) + 1 }), {});
  console.log(`Industry catalogue ready for ${pending.length} demo businesses: ${Object.entries(counts).map(([key, value]) => `${key} ${value}`).join(', ')}`);
}

// The largest cities get one demo business of every kind, so any industry
// filter returns results there. Idempotent: only missing ones are created.
const MAJOR_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Hyderabad', 'Sialkot'];
const STAFF_NAMES = ['Ahmed Raza', 'Sana Tariq', 'Bilal Khan', 'Ayesha Noor', 'Usman Ali', 'Hina Javed', 'Fahad Iqbal', 'Mariam Aslam', 'Hamza Sheikh', 'Zainab Riaz'];
const AREAS = ['Main Boulevard', 'City Centre', 'Commercial Market', 'Model Town'];

async function ensureMajorCityCoverage(companyPasswordHash) {
  const City = require('../models/City');
  const cities = await City.find({ name: { $in: MAJOR_CITIES } }, 'name province').lean();
  const present = await Company.find({ city: { $in: MAJOR_CITIES }, approvalStatus: 'approved' }, 'city businessCategory').lean();
  const has = new Set(present.map((company) => `${company.city}:${company.businessCategory}`));
  const missing = [];
  cities.forEach((city, cityIndex) => SHOWCASE_BRANDS.forEach((brand, brandIndex) => {
    if (!has.has(`${city.name}:${brand[1]}`)) missing.push({ city, brand, index: cityIndex * SHOWCASE_BRANDS.length + brandIndex });
  }));
  if (!missing.length) return;

  for (const { city, brand: [brandName, businessCategory, description, roles], index } of missing) {
    const name = `${city.name} ${brandName}`;
    const slug = slugify(name);
    // eslint-disable-next-line no-await-in-loop
    if (await Company.exists({ slug })) continue;
    const ownerEmail = `owner.${slug}@fleetos.local`;
    const area = AREAS[index % AREAS.length];
    // eslint-disable-next-line no-await-in-loop
    const owner = await User.findOneAndUpdate(
      { email: ownerEmail },
      { $setOnInsert: { name: `${name} Owner`, email: ownerEmail, password: companyPasswordHash, role: 'company', status: 'active', city: city.name, phone: `+92 300 ${String(8100000 + index).slice(0, 7)}` } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    // eslint-disable-next-line no-await-in-loop
    const company = await Company.create({
      name, slug, owner: owner._id, description, businessCategory,
      email: `${slug}@fleetos.local`, phone: owner.phone, location: `${area}, ${city.name}`, city: city.name, province: city.province,
      areas: [`${city.name} ${area}`, `${city.name} Cantt`, `${city.name} Saddar`],
      rating: Number((4.4 + (index % 6) / 10).toFixed(1)), reviewCount: 0,
      approvalStatus: 'approved', approvedAt: new Date(), heroImage: coverImageFor(businessCategory, slug, name), seedProfileVersion: CATALOGUE_VERSION,
    });
    owner.company = company._id;
    // eslint-disable-next-line no-await-in-loop
    await owner.save();
    const category = categoryOf(businessCategory);
    // eslint-disable-next-line no-await-in-loop
    await Service.insertMany(category.starter.map(([serviceName, offeringCategory, price, durationMinutes, kind, unit, serviceDescription], position) => ({ company: company._id, serviceId: `SVC-${position + 1}`, name: serviceName, category: offeringCategory, price, durationMinutes, kind, unit, description: serviceDescription, status: 'Active' })));
    if (category.stock.length && category.modules.inventory !== false) {
      // eslint-disable-next-line no-await-in-loop
      await Inventory.insertMany(category.stock.map(([sku, itemName, stockCategory, quantity, reorderLevel, unitCost]) => ({ company: company._id, sku, name: itemName, category: stockCategory, quantity, reorderLevel, unitCost, unitPrice: Math.round(unitCost * 1.2), warehouse: `${city.name} Main` })));
    }
    // eslint-disable-next-line no-await-in-loop
    await Technician.insertMany(roles.map((role, position) => ({ company: company._id, techId: `TECH-${position + 1}`, name: STAFF_NAMES[(index + position * 3) % STAFF_NAMES.length], role, skills: [role, ...category.examples.slice(0, 2)], rating: 4.5 + (position % 4) / 10, experienceYears: 2 + position * 2, status: 'Available', phone: `+92 301 55${String(index).padStart(3, '0')}${position}` })));
  }
  console.log(`Added ${missing.length} demo businesses so every major city has every industry`);
}

// The first seed gave every demo business the same five generic stock items.
// Each industry now has its own stock, so those placeholders only confuse
// (a restaurant offering a "Business Setup Pack" as an add-on). Idempotent.
// The original fleet-maintenance seed also left vehicle parts everywhere; those
// stay only with auto repair businesses.
const GENERIC_SKUS = ['INS-001', 'RTL-001', 'SUP-001', 'BUS-001', 'DIG-001'];
const VEHICLE_SKUS = ['MNT-001', 'MNT-002', 'MEC-001', 'CLM-001', 'DGN-001', 'BRK-001', 'FLT-001', 'AIR-001', 'CLT-001', 'BAT-001'];
async function pruneGenericStock() {
  const demo = { ...SEEDED, seedProfileVersion: { $gte: CATALOGUE_VERSION } };
  const [companies, nonAuto] = await Promise.all([
    Company.find(demo).distinct('_id'),
    Company.find({ ...demo, businessCategory: { $ne: 'auto-services' } }).distinct('_id'),
  ]);
  if (!companies.length) return;
  const results = await Promise.all([
    Inventory.deleteMany({ company: { $in: companies }, sku: { $in: GENERIC_SKUS } }),
    Inventory.deleteMany({ company: { $in: nonAuto }, sku: { $in: VEHICLE_SKUS } }),
  ]);
  const deletedCount = results.reduce((sum, result) => sum + result.deletedCount, 0);
  if (deletedCount) console.log(`Removed ${deletedCount} placeholder stock items that did not fit demo businesses`);
}

module.exports = { seedIndustries, ensureMajorCityCoverage, pruneGenericStock, SHOWCASE_BRANDS };
