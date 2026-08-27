const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
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

const providers = [
  { name: 'Lahore Home Solutions', slug: 'pak-fleet-mobility', city: 'Lahore', province: 'Punjab', location: 'Gulberg III, Lahore', email: 'company@fleetos.local', phone: '+92 42 35781234', description: 'Verified home, installation, and repair services for Lahore clients.', rating: 4.8 },
  { name: 'Karachi Product Hub', slug: 'karachi-fleet-care', city: 'Karachi', province: 'Sindh', location: 'Korangi Industrial Area, Karachi', email: 'hello@karachifleetcare.pk', phone: '+92 21 35124880', description: 'Retail products, add-ons, and client service packages across Karachi.', rating: 4.7 },
  { name: 'Capital Business Services', slug: 'capital-auto-response', city: 'Islamabad', province: 'Islamabad Capital Territory', location: 'I-9 Industrial Area, Islamabad', email: 'ops@capitalresponse.pk', phone: '+92 51 4439821', description: 'Professional business support, digital setup, and service fulfillment in Islamabad.', rating: 4.6 },
  { name: 'Multan Smart Services', slug: 'multan-commercial-motors', city: 'Multan', province: 'Punjab', location: 'Bosan Road, Multan', email: 'service@multanmotors.pk', phone: '+92 61 6512210', description: 'Local product, home service, and customer support packages in South Punjab.', rating: 4.5 },
  { name: 'Peshawar Service Market', slug: 'peshawar-roadworks', city: 'Peshawar', province: 'Khyber Pakhtunkhwa', location: 'Hayatabad, Peshawar', email: 'dispatch@roadworks.pk', phone: '+92 91 5812234', description: 'Trusted company offers, client requests, and staff assignment workflows.', rating: 4.6 },
  { name: 'Quetta Digital & Retail', slug: 'quetta-fleet-support', city: 'Quetta', province: 'Balochistan', location: 'Airport Road, Quetta', email: 'care@quettafleet.pk', phone: '+92 81 2821440', description: 'Digital services, retail product offers, and verified local support in Quetta.', rating: 4.4 },
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

function companyHeroImage(name, city) {
  const safeName = String(name || 'FleetOS Company').replace(/[<>&"]/g, '');
  const safeCity = String(city || 'Pakistan').replace(/[<>&"]/g, '');
  const hue = crypto.createHash('sha1').update(`${safeName}-${safeCity}`).digest('hex').slice(0, 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#0D1B2A"/><stop offset=".55" stop-color="#1B263B"/><stop offset="1" stop-color="#${hue}"/></linearGradient><radialGradient id="r" cx=".8" cy=".15" r=".6"><stop stop-color="#E0E1DD" stop-opacity=".32"/><stop offset="1" stop-color="#E0E1DD" stop-opacity="0"/></radialGradient></defs><rect width="960" height="540" rx="46" fill="url(#g)"/><rect width="960" height="540" rx="46" fill="url(#r)"/><circle cx="760" cy="115" r="88" fill="#778DA9" opacity=".28"/><circle cx="825" cy="190" r="128" fill="#415A77" opacity=".24"/><rect x="70" y="325" width="820" height="118" rx="34" fill="#E0E1DD" opacity=".12"/><text x="82" y="244" fill="#FFFFFF" font-family="Inter,Arial,sans-serif" font-size="58" font-weight="800">${safeName}</text><text x="86" y="296" fill="#E0E1DD" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="600">${safeCity} marketplace company</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function generatedCityProviders(cities) {
  const brands = [
    ['Home Solutions', 'Verified home, repair, and installation services for local clients.'],
    ['Product Hub', 'Retail products, add-ons, and transparent client request handling.'],
    ['Business Services', 'Professional service packages, support staff, and city-wise fulfilment.'],
    ['Digital & Retail', 'Digital setup, retail offers, and client support under one company portal.'],
  ];
  return cities.flatMap((city, cityIndex) => brands.map(([brand, description], brandIndex) => {
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
      rating: Number((4.2 + ((cityIndex + brandIndex) % 7) / 10).toFixed(1)),
    };
  }));
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
    admin = await User.create({ name: 'FleetOS Super Admin', email: 'admin@fleetos.local', password: await bcrypt.hash(password, 12), role: 'super-admin' });
  }
  console.log(`Super Admin: ${admin.email}`);
  if (password) console.log(`Super Admin password: ${password}`);
}

async function bootstrap() {
  // Migrate the early sparse indexes: MongoDB indexes explicit null values, so
  // old development data could violate idempotency uniqueness on startup.
  await Booking.collection.updateMany({ idempotencyKey: null }, { $unset: { idempotencyKey: 1 } });
  await Payment.collection.updateMany({ idempotencyKey: null }, { $unset: { idempotencyKey: 1 } });
  await Booking.collection.dropIndex('customer_1_idempotencyKey_1').catch((error) => {
    if (error.codeName !== 'IndexNotFound') throw error;
  });
  await Payment.collection.dropIndex('customer_1_idempotencyKey_1').catch((error) => {
    if (error.codeName !== 'IndexNotFound') throw error;
  });
  await Promise.all([
    Service.collection.dropIndex('companyId_1').catch((error) => {
      if (error.codeName !== 'IndexNotFound') throw error;
    }),
    Service.collection.dropIndex('companyId_1_serviceId_1').catch((error) => {
      if (error.codeName !== 'IndexNotFound') throw error;
    }),
    Technician.collection.dropIndex('companyId_1').catch((error) => {
      if (error.codeName !== 'IndexNotFound') throw error;
    }),
    Technician.collection.dropIndex('companyId_1_techId_1').catch((error) => {
      if (error.codeName !== 'IndexNotFound') throw error;
    }),
    Inventory.collection.dropIndex('companyId_1').catch((error) => {
      if (error.codeName !== 'IndexNotFound') throw error;
    }),
    Inventory.collection.dropIndex('companyId_1_sku_1').catch((error) => {
      if (error.codeName !== 'IndexNotFound') throw error;
    }),
    Review.collection.dropIndex('user_1').catch((error) => {
      if (error.codeName !== 'IndexNotFound') throw error;
    }),
    Review.collection.dropIndex('companyId_1').catch((error) => {
      if (error.codeName !== 'IndexNotFound') throw error;
    }),
    Review.collection.dropIndex('bookingId_1').catch((error) => {
      if (error.codeName !== 'IndexNotFound') throw error;
    }),
  ]);
  await Promise.all([Company.syncIndexes(), Booking.syncIndexes(), Payment.syncIndexes(), Service.syncIndexes(), Technician.syncIndexes(), Inventory.syncIndexes(), Review.syncIndexes()]);

  if (process.env.NODE_ENV === 'production') {
    const admin = await User.findOne({ role: 'super-admin' }).select('email').lean();
    if (!admin) console.warn('No Super Admin exists. Run npm --prefix server run set-admin with the production MONGODB_URI.');
    else console.log(`Super Admin: ${admin.email}`);
    console.log('Production database ready; development seed data was not modified.');
    return;
  }

  await ensureAdmin();
  const customerPassword = await bcrypt.hash('FleetCustomer1!', 12);
  const companyPassword = await bcrypt.hash('FleetCompany1!', 12);

  const customer = await User.findOneAndUpdate(
    { email: 'customer@fleetos.local' },
    { $setOnInsert: { name: 'Ali Shahzad', email: 'customer@fleetos.local', password: customerPassword, role: 'customer', phone: '+92 300 1234567', city: 'Lahore', address: 'Johar Town, Lahore' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const cities = Object.entries(cityGroups).flatMap(([province, names]) => names.map((name) => ({ name, province })));
  await City.bulkWrite(cities.map((city) => ({ updateOne: { filter: city, update: { $setOnInsert: city }, upsert: true } })), { ordered: false });

  const providerMap = new Map();
  for (const provider of [...providers, ...generatedCityProviders(cities)]) {
    providerMap.set(provider.slug, provider);
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
  const hasCategoryCoverage = categoryCoverage >= providerMap.size * 2;
  const canReuseSeed = existingApprovedProviders >= providerMap.size
    && hasCategoryCoverage
    && process.env.FORCE_BOOTSTRAP !== 'true';
  if (canReuseSeed) {
    const mainCompany = await Company.findOne({ slug: 'pak-fleet-mobility' });
    const owner = mainCompany ? await User.findOne({ company: mainCompany._id, role: 'company' }) : null;
    const booking = mainCompany ? await Booking.findOne({ company: mainCompany._id }).sort({ createdAt: -1 }) : null;
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
        $set: { role: 'company', status: 'active', phone: data.phone, city: data.city },
        $setOnInsert: { name: `${data.name} Owner`, email: ownerEmail, password: companyPassword },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const company = await Company.findOneAndUpdate(
      { slug: data.slug },
      { $set: { ...data, owner: owner._id, approvalStatus: 'approved', heroImage: companyHeroImage(data.name, data.city) }, $setOnInsert: { approvedAt: new Date() } },
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
  for (const company of createdProviders) {
    for (let index = 0; index < serviceBlueprints.length; index += 1) {
      const [name, category, price, durationMinutes] = serviceBlueprints[index];
      await Service.updateOne(
        { company: company._id, serviceId: `SVC-${index + 1}` },
        { $setOnInsert: { company: company._id, serviceId: `SVC-${index + 1}`, name, category, price, durationMinutes, description: `${name} by verified company staff.` } },
        { upsert: true }
      );
    }
  }

  const techNames = ['Imran Ali', 'Faisal Khan', 'Usman Raza'];
  for (const company of createdProviders) {
    for (let index = 0; index < techNames.length; index += 1) {
      await Technician.updateOne(
        { company: company._id, techId: `TECH-${index + 1}` },
        { $setOnInsert: { company: company._id, techId: `TECH-${index + 1}`, name: techNames[index], role: index % 2 ? 'Service Specialist' : 'Client Support Staff', rating: 4.5 + (index % 4) / 10, experienceYears: 3 + index, status: index === 0 && String(company._id) === String(mainCompany._id) ? 'On Job' : 'Available', phone: `+92 300 55500${index}` } },
        { upsert: true }
      );
    }
  }

  const inventoryBlueprints = [
    ['INS-001', 'Installation Starter Kit', 'Installation', 16, 6, 5200],
    ['RTL-001', 'Premium Product Add-on', 'Retail Product', 20, 8, 1450],
    ['SUP-001', 'Support Visit Toolkit', 'Repair & Support', 14, 6, 4200],
    ['BUS-001', 'Business Setup Pack', 'Business Service', 12, 5, 3100],
    ['DIG-001', 'Digital Configuration Report', 'Digital Service', 50, 10, 900],
  ];
  for (const company of createdProviders) {
    for (const [sku, name, category, quantity, reorderLevel, unitCost] of inventoryBlueprints) {
      await Inventory.updateOne({ company: company._id, sku }, { $setOnInsert: { company: company._id, sku, name, category, quantity, reorderLevel, unitCost, unitPrice: Math.round(unitCost * 1.25), warehouse: `${company.city} Main` } }, { upsert: true });
    }
  }

  await Customer.updateOne(
    { company: mainCompany._id, customerId: 'CUST-1001' },
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
      { company: company._id, customerId: `CUST-${digest}` },
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
          pricing: { serviceTotal: revenueService.price, materialsTotal: 2500, tax: Math.round((revenueService.price + 2500) * 0.05), finalTotal: revenueService.price + 2500 + Math.round((revenueService.price + 2500) * 0.05) },
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

  console.log(`FleetOS seed ready: ${createdProviders.length} providers, ${cities.length} Pakistan cities.`);
  console.log('Customer: customer@fleetos.local / FleetCustomer1!');
  console.log('Company: company@fleetos.local / FleetCompany1!');
  return { customer, owner, mainCompany, booking };
}

module.exports = bootstrap;
