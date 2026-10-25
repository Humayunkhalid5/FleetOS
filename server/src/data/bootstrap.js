const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { hashPassword } = require('../utils/passwords');
const User = require('../models/User');
const Company = require('../models/Company');
const Service = require('../models/Service');
const Technician = require('../models/Technician');
const Inventory = require('../models/Inventory');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Customer = require('../models/Customer');
const City = require('../models/City');
const { coverImageFor, GENERATED_COVER, MANAGED_COVER } = require('./coverImages');
const { seedIndustries, ensureMajorCityCoverage, pruneGenericStock } = require('./industrySeed');

const providers = [
  { name: 'Lahore Home Solutions', slug: 'pak-fleet-mobility', city: 'Lahore', province: 'Punjab', location: 'Gulberg III, Lahore', email: 'company@fleetos.local', phone: '+92 42 35781234', description: 'Verified home, installation, and repair services for Lahore clients.', businessCategory: 'field-services', rating: 4.8 },
  { name: 'Karachi Product Hub', slug: 'karachi-fleet-care', city: 'Karachi', province: 'Sindh', location: 'Korangi Industrial Area, Karachi', email: 'hello@karachifleetcare.pk', phone: '+92 21 35124880', description: 'Retail products, add-ons, and client service packages across Karachi.', businessCategory: 'retail-products', rating: 4.7 },
  { name: 'Capital Business Services', slug: 'capital-auto-response', city: 'Islamabad', province: 'Islamabad Capital Territory', location: 'I-9 Industrial Area, Islamabad', email: 'ops@capitalresponse.pk', phone: '+92 51 4439821', description: 'Professional business support, digital setup, and service fulfillment in Islamabad.', businessCategory: 'professional-services', rating: 4.6 },
  { name: 'Multan Smart Services', slug: 'multan-commercial-motors', city: 'Multan', province: 'Punjab', location: 'Bosan Road, Multan', email: 'service@multanmotors.pk', phone: '+92 61 6512210', description: 'Local product, home service, and customer support packages in South Punjab.', businessCategory: 'digital-technology', rating: 4.5 },
  { name: 'Peshawar Service Market', slug: 'peshawar-roadworks', city: 'Peshawar', province: 'Khyber Pakhtunkhwa', location: 'Hayatabad, Peshawar', email: 'dispatch@roadworks.pk', phone: '+92 91 5812234', description: 'Trusted company offers, client requests, and staff assignment workflows.', businessCategory: 'oil-energy', rating: 4.6 },
  { name: 'Quetta Digital & Retail', slug: 'quetta-fleet-support', city: 'Quetta', province: 'Balochistan', location: 'Airport Road, Quetta', email: 'care@quettafleet.pk', phone: '+92 81 2821440', description: 'Digital services, retail product offers, and verified local support in Quetta.', businessCategory: 'digital-technology', rating: 4.4 },
];

const cityGroups = {
  Punjab: ['Lahore', 'Faisalabad', 'Rawalpindi', 'Gujranwala', 'Multan', 'Bahawalpur', 'Sargodha', 'Sialkot', 'Sheikhupura', 'Rahim Yar Khan', 'Jhang', 'Dera Ghazi Khan', 'Gujrat', 'Sahiwal', 'Wah Cantonment', 'Kasur', 'Okara', 'Chiniot', 'Kamoke', 'Hafizabad', 'Mandi Bahauddin', 'Jhelum', 'Khanewal', 'Pakpattan', 'Attock', 'Bhakkar', 'Chakwal', 'Layyah', 'Lodhran', 'Mianwali', 'Muzaffargarh', 'Nankana Sahib', 'Narowal', 'Rajanpur', 'Toba Tek Singh', 'Ahmadpur East', 'Arifwala', 'Bhalwal', 'Burewala', 'Chichawatni', 'Chishtian', 'Daska', 'Depalpur', 'Dina', 'Dunyapur', 'Ferozewala', 'Gojra', 'Gujar Khan', 'Haroonabad', 'Hasilpur', 'Jalalpur Jattan', 'Jampur', 'Jaranwala', 'Kahror Pakka', 'Kharian', 'Khushab', 'Kot Addu', 'Liaquatpur', 'Mailsi', 'Mian Channu', 'Muridke', 'Murree', 'Pindi Bhattian', 'Pir Mahal', 'Qila Didar Singh', 'Renala Khurd', 'Sambrial', 'Samundri', 'Shakargarh', 'Shorkot', 'Shujaabad', 'Taxila', 'Vehari', 'Wazirabad', 'Yazman', 'Zafarwal', 'Kot Momin', 'Lala Musa', 'Pattoki', 'Tandlianwala'],
  Sindh: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Mirpur Khas', 'Jacobabad', 'Shikarpur', 'Khairpur', 'Dadu', 'Thatta', 'Badin', 'Ghotki', 'Kashmore', 'Matiari', 'Sanghar', 'Tando Allahyar', 'Tando Muhammad Khan', 'Umerkot', 'Jamshoro', 'Naushahro Feroze', 'Sujawal', 'Tando Adam', 'Shahdadkot', 'Shahdadpur', 'Moro', 'Kotri', 'Rohri', 'Kandhkot', 'Ratodero', 'Sehwan', 'Hala', 'Tando Jam', 'Digri', 'Kunri', 'Samaro', 'Mithi', 'Islamkot', 'Diplo', 'Nagarparkar', 'Khipro', 'Sinjhoro', 'Sakrand', 'Qazi Ahmad', 'Mehrabpur', 'Kandiaro', 'Gambat', 'Ranipur', 'Sobhodero', 'Dokri', 'Warah', 'Mehar', 'Johi', 'Sehwan Sharif', 'Mirpur Mathelo', 'Daharki', 'Ubauro'],
  'Khyber Pakhtunkhwa': ['Peshawar', 'Mardan', 'Mingora', 'Abbottabad', 'Kohat', 'Bannu', 'Dera Ismail Khan', 'Mansehra', 'Nowshera', 'Swabi', 'Charsadda', 'Haripur', 'Chitral', 'Dir', 'Hangu', 'Karak', 'Lakki Marwat', 'Malakand', 'Shangla', 'Tank', 'Batkhela', 'Parachinar', 'Timergara', 'Upper Dir', 'Daggar', 'Alpuri', 'Besham', 'Havelian', 'Takht-i-Bahi', 'Risalpur', 'Akora Khattak', 'Pabbi', 'Topi', 'Lahor', 'Tangi', 'Shabqadar', 'Jamrud', 'Landi Kotal', 'Bara', 'Mir Ali', 'Wana', 'Kulachi', 'Paharpur', 'Daraban', 'Domel', 'Serai Naurang'],
  Balochistan: ['Quetta', 'Gwadar', 'Turbat', 'Khuzdar', 'Chaman', 'Hub', 'Sibi', 'Zhob', 'Loralai', 'Dera Murad Jamali', 'Pishin', 'Nushki', 'Kalat', 'Mastung', 'Kharan', 'Panjgur', 'Usta Muhammad', 'Dera Allah Yar', 'Dera Bugti', 'Kohlu', 'Barkhan', 'Musakhel', 'Qila Saifullah', 'Qila Abdullah', 'Harnai', 'Ziarat', 'Awaran', 'Lasbela', 'Bela', 'Ormara', 'Pasni', 'Jiwani', 'Surab', 'Washuk', 'Dalbandin', 'Taftan', 'Mach', 'Dhadar'],
  'Islamabad Capital Territory': ['Islamabad'],
  'Azad Jammu and Kashmir': ['Muzaffarabad', 'Mirpur', 'Kotli', 'Bagh', 'Rawalakot', 'Bhimber', 'Hattian Bala', 'Haveli', 'Palandri', 'Dadyal', 'Sehnsa', 'Athmuqam'],
  'Gilgit-Baltistan': ['Gilgit', 'Skardu', 'Chilas', 'Aliabad', 'Khaplu', 'Gahkuch', 'Astore', 'Shigar', 'Nagar', 'Hunza', 'Danyor', 'Gultari'],
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function phoneForSeed(index) {
  return `+92 300 ${String(7000000 + index).slice(0, 7)}`;
}

// Companies with no cover, or with a cover generated by an earlier version,
// get a category photo address stored in MongoDB. Uploaded covers are kept.
async function refreshLegacyCovers() {
  const candidates = await Company.find({ $or: [{ heroImage: { $in: ['', null] } }, { heroImage: GENERATED_COVER }, { heroImage: MANAGED_COVER }] }, 'name slug businessCategory heroImage').lean();
  const stale = candidates
    .map((company) => ({ company, cover: coverImageFor(company.businessCategory, company.slug, company.name) }))
    .filter(({ company, cover }) => company.heroImage !== cover);
  if (!stale.length) return;
  await Company.bulkWrite(stale.map(({ company, cover }) => ({ updateOne: { filter: { _id: company._id }, update: { $set: { heroImage: cover } } } })), { ordered: false });
  console.log(`Stored cover image addresses for ${stale.length} companies`);
}

// Earlier seeds could store the demo customer twice for one company.
async function mergeDuplicateCustomers() {
  const groups = await Customer.aggregate([
    { $match: { email: { $type: 'string', $ne: '' } } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: { company: '$company', email: '$email' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  const extra = groups.flatMap((group) => group.ids.slice(1));
  if (extra.length) await Customer.deleteMany({ _id: { $in: extra } });
}

function generatedCityProviders(cities) {
  const brands = [
    ['Home Solutions', 'Verified home, repair, and installation services for local clients.', 'field-services'],
    ['Product Hub', 'Retail products, add-ons, and transparent client request handling.', 'retail-products'],
    ['Business Services', 'Professional service packages, support staff, and city-wise fulfilment.', 'professional-services'],
    ['Digital & Retail', 'Digital setup, retail offers, and client support under one company portal.', 'digital-technology'],
  ];
  return cities.flatMap((city, cityIndex) => brands.map(([brand, description, businessCategory], brandIndex) => {
    const slug = `${slugify(city.name)}-${slugify(brand)}`;
    return {
      name: `${city.name} ${brand}`,
      slug,
      city: city.name,
      province: city.province,
      location: `${['Central Market', 'Industrial Area', 'Main Road', 'Service District'][brandIndex]}, ${city.name}`,
      areas: [`${city.name} Central`, `${city.name} Industrial Area`, `${city.name} Main Road`],
      email: `${slug}@fleetos.local`,
      ownerEmail: `owner.${slug}@fleetos.local`,
      phone: phoneForSeed(cityIndex * brands.length + brandIndex),
      description,
      businessCategory,
      rating: Number((4.2 + ((cityIndex + brandIndex) % 7) / 10).toFixed(1)),
    };
  }));
}

// A fresh database has neither the legacy index nor its collection yet;
// MongoDB reports those as IndexNotFound / NamespaceNotFound respectively.
async function bulkUpsert(Model, records, batchSize = 500) {
  for (let start = 0; start < records.length; start += batchSize) {
    const batch = records.slice(start, start + batchSize);
    // eslint-disable-next-line no-await-in-loop
    await Model.bulkWrite(batch.map(({ filter, insert }) => ({ updateOne: { filter, update: { $setOnInsert: insert }, upsert: true } })), { ordered: false });
  }
}

function isMissingIndexError(error) {
  return ['IndexNotFound', 'NamespaceNotFound'].includes(error?.codeName) || [26, 27].includes(error?.code);
}

async function ensureAdmin() {
  const runtimeDir = path.resolve(__dirname, '../../.runtime');
  const passwordPath = path.join(runtimeDir, 'dev-admin-password');
  fs.mkdirSync(runtimeDir, { recursive: true });
  let password = '';
  let admin = await User.findOne({ role: 'super-admin' });
  if (!admin) {
    password = fs.existsSync(passwordPath) ? fs.readFileSync(passwordPath, 'utf8').trim() : `Fleet-${crypto.randomBytes(8).toString('base64url')}!7a`;
    fs.writeFileSync(passwordPath, password, 'utf8');
    admin = await User.create({ name: 'FleetOS Super Admin', email: 'admin@fleetos.local', password: await hashPassword(password), role: 'super-admin' });
  }
  console.log(`Super Admin: ${admin.email}`);
  if (password) console.log(`Super Admin password: ${password}`);
}

async function bootstrap() {
  // Migrate the early sparse indexes: MongoDB indexes explicit null values, so
  // old development data could violate idempotency uniqueness on startup.
  await Booking.collection.updateMany({ idempotencyKey: null }, { $unset: { idempotencyKey: 1 } });
  await Payment.collection.updateMany({ idempotencyKey: null }, { $unset: { idempotencyKey: 1 } });
  // Early chat threads were stored with a real service snapshot, so they showed
  // up as PKR 0 jobs in request and dispatch queues. They are inquiries.
  await Booking.collection.updateMany(
    { reference: /^FOS-CHAT-/, 'serviceSnapshot.category': { $ne: 'Inquiry' }, 'pricing.finalTotal': 0 },
    { $set: { 'serviceSnapshot.name': 'General company inquiry', 'serviceSnapshot.category': 'Inquiry', 'serviceSnapshot.price': 0 } },
  );
  await Booking.collection.dropIndex('customer_1_idempotencyKey_1').catch((error) => {
    if (!isMissingIndexError(error)) throw error;
  });
  await Payment.collection.dropIndex('customer_1_idempotencyKey_1').catch((error) => {
    if (!isMissingIndexError(error)) throw error;
  });
  await Promise.all([
    Service.collection.dropIndex('companyId_1').catch((error) => {
      if (!isMissingIndexError(error)) throw error;
    }),
    Service.collection.dropIndex('companyId_1_serviceId_1').catch((error) => {
      if (!isMissingIndexError(error)) throw error;
    }),
    Technician.collection.dropIndex('companyId_1').catch((error) => {
      if (!isMissingIndexError(error)) throw error;
    }),
    Technician.collection.dropIndex('companyId_1_techId_1').catch((error) => {
      if (!isMissingIndexError(error)) throw error;
    }),
    Inventory.collection.dropIndex('companyId_1').catch((error) => {
      if (!isMissingIndexError(error)) throw error;
    }),
    Inventory.collection.dropIndex('companyId_1_sku_1').catch((error) => {
      if (!isMissingIndexError(error)) throw error;
    }),
    Review.collection.dropIndex('user_1').catch((error) => {
      if (!isMissingIndexError(error)) throw error;
    }),
    Review.collection.dropIndex('companyId_1').catch((error) => {
      if (!isMissingIndexError(error)) throw error;
    }),
    Review.collection.dropIndex('bookingId_1').catch((error) => {
      if (!isMissingIndexError(error)) throw error;
    }),
  ]);
  try {
    await Promise.all([Company.syncIndexes(), Booking.syncIndexes(), Payment.syncIndexes(), Service.syncIndexes(), Technician.syncIndexes(), Inventory.syncIndexes(), Review.syncIndexes()]);
  } catch (error) {
    // MongoDB rejects index maintenance when the host drive is critically low.
    // Existing indexes and all application CRUD stay usable, so do not take the
    // whole SaaS offline during a development restart. Any other index error is
    // still fatal and visible immediately.
    if (!/available disk space.*required minimum/i.test(String(error.message || ''))) throw error;
    console.warn(`Skipping index maintenance until disk space is available: ${error.message}`);
  }

  if (process.env.NODE_ENV === 'production') {
    const admin = await User.findOne({ role: 'super-admin' }).select('email').lean();
    if (!admin) console.warn('No Super Admin exists. Run npm --prefix server run set-admin with the production MONGODB_URI.');
    else console.log(`Super Admin: ${admin.email}`);
    console.log('Production database ready; development seed data was not modified.');
    return;
  }

  await ensureAdmin();
  await refreshLegacyCovers().catch((error) => console.warn(`Cover refresh skipped: ${error.message}`));
  await mergeDuplicateCustomers().catch((error) => console.warn(`Customer merge skipped: ${error.message}`));
  const customerPassword = await hashPassword('FleetCustomer1!');
  const companyPassword = await hashPassword('FleetCompany1!');

  const customer = await User.findOneAndUpdate(
    { email: 'customer@fleetos.local' },
    {
      $set: { password: customerPassword, role: 'customer', status: 'active' },
      $setOnInsert: { name: 'Ali Shahzad', email: 'customer@fleetos.local', phone: '+92 300 1234567', city: 'Lahore', address: 'Johar Town, Lahore' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const cities = Object.entries(cityGroups).flatMap(([province, names]) => names.map((name) => ({ name, province })));
  // Only touch the city catalogue when entries are missing (keeps restarts fast).
  if (await City.countDocuments() < cities.length) {
    await City.bulkWrite(cities.map((city) => ({ updateOne: { filter: city, update: { $setOnInsert: city }, upsert: true } })), { ordered: false });
  }

  const providerMap = new Map();
  // SEED_CITY_CATALOGUE=false seeds only the six named demo providers, which
  // keeps a throwaway development database quick to create.
  const catalogue = process.env.SEED_CITY_CATALOGUE === 'false' ? [] : generatedCityProviders(cities);
  for (const provider of [...providers, ...catalogue]) {
    providerMap.set(provider.slug, provider);
  }

  // Earlier demo records predate business categories. Migrate only the
  // reserved built-in catalogue once; owner-created companies are never
  // touched. This lets the existing demonstration catalogue exercise the
  // different workspace capabilities without changing real registrations.
  // Keep this intentionally small: these are the six named demo accounts
  // that can be signed into during a presentation. The wider city catalogue
  // remains a discovery fixture and is not rewritten on every server start.
  const seedWorkspaceProfiles = providers;
  const pendingSeedWorkspaceMigration = { $or: [{ seedProfileVersion: { $exists: false } }, { seedProfileVersion: { $lt: 1 } }] };
  const seedWorkspaceTargets = await Company.countDocuments({ slug: { $in: seedWorkspaceProfiles.map((provider) => provider.slug) }, ...pendingSeedWorkspaceMigration });
  if (seedWorkspaceTargets) {
    await Company.bulkWrite(seedWorkspaceProfiles.map((provider) => ({
      updateOne: {
        filter: { slug: provider.slug, ...pendingSeedWorkspaceMigration },
        update: { $set: { businessCategory: provider.businessCategory || 'field-services', seedProfileVersion: 1 } },
      },
    })), { ordered: false });
  }

  const [existingApprovedProviders, categoryCoverage] = await Promise.all([
    Company.countDocuments({
      slug: { $in: [...providerMap.keys()] },
      approvalStatus: 'approved',
    }),
    Service.countDocuments({
      status: 'Active',
      category: { $in: ['Home Service', 'Business Service'] },
    }),
  ]);
  // Older development databases were created before Home and Business
  // services existed. Run the idempotent service upserts once so each visible
  // marketplace filter has real database-backed results.
  // Catalogues refreshed by the industry seed count as covered too.
  const refreshedCatalogues = await Company.countDocuments({ slug: { $in: [...providerMap.keys()] }, seedProfileVersion: { $gte: 2 } });
  const hasCategoryCoverage = categoryCoverage >= providerMap.size * 2 || refreshedCatalogues >= providerMap.size;
  const canReuseSeed = existingApprovedProviders >= providerMap.size
    && hasCategoryCoverage
    && process.env.FORCE_BOOTSTRAP !== 'true';
  if (canReuseSeed) {
    const mainCompany = await Company.findOne({ slug: 'pak-fleet-mobility' });
    const owner = mainCompany ? await User.findOneAndUpdate(
      { email: 'company@fleetos.local' },
      {
        $set: {
          password: companyPassword,
          role: 'company',
          status: 'active',
          phone: mainCompany.phone,
          city: mainCompany.city,
          company: mainCompany._id,
        },
        $setOnInsert: { name: `${mainCompany.name} Owner`, email: 'company@fleetos.local' },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ) : null;
    if (mainCompany && owner && String(mainCompany.owner) !== String(owner._id)) {
      mainCompany.owner = owner._id;
      await mainCompany.save();
    }
    const booking = mainCompany ? await Booking.findOne({ company: mainCompany._id }).sort({ createdAt: -1 }) : null;
    await seedIndustries({ generatedSlugs: [...providerMap.keys()] }).catch((error) => console.warn(`Industry catalogue skipped: ${error.message}`));
    await ensureMajorCityCoverage(companyPassword).catch((error) => console.warn(`City coverage skipped: ${error.message}`));
    await pruneGenericStock().catch((error) => console.warn(`Stock cleanup skipped: ${error.message}`));
    await refreshLegacyCovers().catch((error) => console.warn(`Cover refresh skipped: ${error.message}`));
  console.log(`FleetOS seed ready: ${existingApprovedProviders} providers already present, ${cities.length} Pakistan cities.`);
    console.log('Customer: customer@fleetos.local / FleetCustomer1!');
    console.log('Company: company@fleetos.local / FleetCompany1!');
    return { customer, owner, mainCompany, booking };
  }

  const createdProviders = [];
  for (const data of providerMap.values()) {
    const ownerEmail = data.ownerEmail || (data.slug === 'pak-fleet-mobility' ? 'company@fleetos.local' : `owner.${data.slug}@fleetos.local`);
    const owner = await User.findOneAndUpdate(
      { email: ownerEmail },
      {
        $set: {
          role: 'company',
          status: 'active',
          phone: data.phone,
          city: data.city,
          ...(ownerEmail === 'company@fleetos.local' ? { password: companyPassword } : {}),
        },
        $setOnInsert: { name: `${data.name} Owner`, email: ownerEmail, password: companyPassword },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const company = await Company.findOneAndUpdate(
      { slug: data.slug },
      { $set: { ...data, owner: owner._id, approvalStatus: 'approved' }, $setOnInsert: { approvedAt: new Date(), heroImage: coverImageFor(data.businessCategory, data.slug, data.name) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (String(owner.company || '') !== String(company._id)) {
      owner.company = company._id;
      await owner.save();
    }
    createdProviders.push(company);
  }
  const mainCompany = createdProviders[0];

  const owner = await User.findOne({ company: mainCompany._id, role: 'company' });

  const serviceBlueprints = [
    ['Premium Installation Package', 'Installation', 18500, 120],
    ['Repair & Support Visit', 'Repair & Support', 12000, 90],
    ['Product Demo Session', 'Retail Product', 7500, 75],
    ['Digital Setup Service', 'Digital Service', 6000, 60],
    ['Basic Service Request', 'Professional Service', 4500, 45],
    ['Home Visit Service', 'Home Service', 8500, 90],
    ['Business Operations Service', 'Business Service', 15000, 120],
  ];
  // Batched idempotent upserts keep a first start fast even with ~1,000
  // catalogue companies (one round trip per batch instead of per record).
  await bulkUpsert(Service, createdProviders.flatMap((company) => serviceBlueprints.map(([name, category, price, durationMinutes], index) => ({
    filter: { company: company._id, serviceId: `SVC-${index + 1}` },
    insert: { company: company._id, serviceId: `SVC-${index + 1}`, name, category, price, durationMinutes, description: `${name} by verified company staff.` },
  }))));

  const techNames = ['Imran Ali', 'Faisal Khan', 'Usman Raza'];
  await bulkUpsert(Technician, createdProviders.flatMap((company) => techNames.map((techName, index) => ({
    filter: { company: company._id, techId: `TECH-${index + 1}` },
    insert: { company: company._id, techId: `TECH-${index + 1}`, name: techName, role: index % 2 ? 'Service Specialist' : 'Client Support Staff', rating: 4.5 + (index % 4) / 10, experienceYears: 3 + index, status: index === 0 && String(company._id) === String(mainCompany._id) ? 'On Job' : 'Available', phone: `+92 300 55500${index}` },
  }))));

  const inventoryBlueprints = [
    ['INS-001', 'Installation Starter Kit', 'Installation', 16, 6, 5200],
    ['RTL-001', 'Premium Product Add-on', 'Retail Product', 20, 8, 1450],
    ['SUP-001', 'Support Visit Toolkit', 'Repair & Support', 14, 6, 4200],
    ['BUS-001', 'Business Setup Pack', 'Business Service', 12, 5, 3100],
    ['DIG-001', 'Digital Configuration Report', 'Digital Service', 50, 10, 900],
  ];
  await bulkUpsert(Inventory, createdProviders.flatMap((company) => inventoryBlueprints.map(([sku, name, category, quantity, reorderLevel, unitCost]) => ({
    filter: { company: company._id, sku },
    insert: { company: company._id, sku, name, category, quantity, reorderLevel, unitCost, unitPrice: Math.round(unitCost * 1.25), warehouse: `${company.city} Main` },
  }))));

  await Customer.updateOne(
    { company: mainCompany._id, email: customer.email },
    { $setOnInsert: { company: mainCompany._id, user: customer._id, customerId: 'CUST-1001', name: customer.name, email: customer.email, phone: customer.phone, address: customer.address, totalJobs: 4, totalSpent: 48500 } },
    { upsert: true }
  );

  const service = await Service.findOne({ company: mainCompany._id, serviceId: 'SVC-1' });
  const technician = await Technician.findOne({ company: mainCompany._id, techId: 'TECH-1' });
  const booking = await Booking.findOneAndUpdate(
    { reference: 'FOS-DEMO-1001' },
      { $setOnInsert: { reference: 'FOS-DEMO-1001', customer: customer._id, company: mainCompany._id, service: service._id, technician: technician._id, serviceSnapshot: { name: service.name, category: service.category, price: service.price }, customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone, vehicle: { label: 'Home installation request', registration: 'REQ-LHR-1001' }, pricing: { serviceTotal: service.price, materialsTotal: 0, tax: 925, finalTotal: 19425 }, status: 'In Progress', statusHistory: [{ status: 'Pending', at: new Date(Date.now() - 86400000), byRole: 'customer' }, { status: 'Assigned', at: new Date(Date.now() - 43200000), byRole: 'company' }, { status: 'In Progress', at: new Date(), byRole: 'company' }], scheduledAt: new Date(Date.now() + 3600000), location: customer.address, paymentMethod: 'cash', tracking: { lat: 31.5204, lng: 74.3587, etaMinutes: 12, vehicleLabel: 'Assigned service staff', updatedAt: new Date() } } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const paidBooking = await Booking.findOneAndUpdate(
    { reference: 'FOS-DEMO-0997' },
    { $setOnInsert: { reference: 'FOS-DEMO-0997', customer: customer._id, company: mainCompany._id, service: service._id, serviceSnapshot: { name: 'Repair & Support Visit', category: 'Repair & Support', price: 12000 }, customerName: customer.name, customerEmail: customer.email, vehicle: { label: 'Completed support request', registration: 'REQ-LHR-0997' }, pricing: { serviceTotal: 12000, materialsTotal: 4000, tax: 800, finalTotal: 16800 }, status: 'Paid', statusHistory: [{ status: 'Paid', at: new Date(Date.now() - 20 * 86400000), byRole: 'company' }], scheduledAt: new Date(Date.now() - 21 * 86400000), location: customer.address, paymentMethod: 'cash' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await Payment.updateOne(
    { booking: paidBooking._id },
    { $setOnInsert: { reference: 'PAY-DEMO-0997', booking: paidBooking._id, customer: customer._id, company: mainCompany._id, amount: paidBooking.pricing.finalTotal, method: 'cash', status: 'recorded', recordedAt: new Date(Date.now() - 20 * 86400000) } },
    { upsert: true }
  );
  await Review.updateOne(
    { booking: paidBooking._id },
    { $setOnInsert: { customer: customer._id, company: mainCompany._id, booking: paidBooking._id, rating: 5, comment: 'Professional team, clear updates, and the service was completed on time.' } },
    { upsert: true }
  );

  for (const company of createdProviders) {
    const digest = crypto.createHash('sha1').update(String(company._id)).digest('hex').slice(0, 10).toUpperCase();
    const revenueService = await Service.findOne({ company: company._id, serviceId: 'SVC-2' });
    const revenueTechnician = await Technician.findOne({ company: company._id, techId: 'TECH-2' });
    if (!revenueService) continue;
    await Customer.updateOne(
      { company: company._id, email: customer.email },
      { $setOnInsert: { company: company._id, user: customer._id, customerId: `CUST-${digest}`, name: customer.name, email: customer.email, phone: customer.phone, address: `${company.city} service address`, totalJobs: 1, totalSpent: revenueService.price } },
      { upsert: true }
    );
    const seededPaidBooking = await Booking.findOneAndUpdate(
      { reference: `FOS-SEED-${digest}` },
      {
        $setOnInsert: {
          reference: `FOS-SEED-${digest}`,
          customer: customer._id,
          company: company._id,
          service: revenueService._id,
          technician: revenueTechnician?._id || null,
          serviceSnapshot: { name: revenueService.name, category: revenueService.category, price: revenueService.price },
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          vehicle: { label: `${company.city} client service request`, registration: `REQ-${digest.slice(0, 4)}` },
          pricing: { serviceTotal: revenueService.price, materialsTotal: 2500, tax: Math.round((revenueService.price + 2500) * 0.085), finalTotal: revenueService.price + 2500 + Math.round((revenueService.price + 2500) * 0.085) },
          status: 'Paid',
          paymentStatus: 'paid',
          statusHistory: [
            { status: 'Pending', at: new Date(Date.now() - 72 * 3600000), byRole: 'customer' },
            { status: 'Assigned', at: new Date(Date.now() - 70 * 3600000), byRole: 'company' },
            { status: 'Completed', at: new Date(Date.now() - 50 * 3600000), byRole: 'company' },
            { status: 'Paid', at: new Date(Date.now() - 49 * 3600000), byRole: 'company', note: 'Seeded recorded payment' },
          ],
          scheduledAt: new Date(Date.now() - 52 * 3600000),
          location: `${company.location || company.city}`,
          paymentMethod: Number.parseInt(digest.slice(-1), 16) % 2 ? 'cash' : 'invoice',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await Payment.updateOne(
      { booking: seededPaidBooking._id },
      { $setOnInsert: { reference: `PAY-SEED-${digest}`, booking: seededPaidBooking._id, customer: customer._id, company: company._id, amount: seededPaidBooking.pricing.finalTotal, method: seededPaidBooking.paymentMethod, status: 'recorded', recordedAt: new Date(Date.now() - 49 * 3600000) } },
      { upsert: true }
    );
    await Review.updateOne(
      { booking: seededPaidBooking._id },
      { $setOnInsert: { customer: customer._id, company: company._id, booking: seededPaidBooking._id, rating: 4 + (Number.parseInt(digest.slice(-1), 16) % 2), comment: `${company.name} completed the service with clear updates and reliable dispatch.` } },
      { upsert: true }
    );
  }

  await seedIndustries({ generatedSlugs: [...providerMap.keys()] }).catch((error) => console.warn(`Industry catalogue skipped: ${error.message}`));
  await ensureMajorCityCoverage(companyPassword).catch((error) => console.warn(`City coverage skipped: ${error.message}`));
  await pruneGenericStock().catch((error) => console.warn(`Stock cleanup skipped: ${error.message}`));
  await refreshLegacyCovers().catch((error) => console.warn(`Cover refresh skipped: ${error.message}`));
  console.log(`FleetOS seed ready: ${createdProviders.length} providers, ${cities.length} Pakistan cities.`);
  console.log('Customer: customer@fleetos.local / FleetCustomer1!');
  console.log('Company: company@fleetos.local / FleetCompany1!');
  return { customer, owner, mainCompany, booking };
}

module.exports = bootstrap;
