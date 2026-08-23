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
  { name: 'Pak Fleet Mobility', slug: 'pak-fleet-mobility', city: 'Lahore', province: 'Punjab', location: 'Gulberg III, Lahore', email: 'company@fleetos.local', phone: '+92 42 35781234', description: 'Commercial fleet maintenance, dispatch and roadside support across Lahore.', rating: 4.8 },
  { name: 'Karachi Fleet Care', slug: 'karachi-fleet-care', city: 'Karachi', province: 'Sindh', location: 'Korangi Industrial Area, Karachi', email: 'hello@karachifleetcare.pk', phone: '+92 21 35124880', description: 'Verified workshop and mobile response coverage for Karachi fleets.', rating: 4.7 },
  { name: 'Capital Auto Response', slug: 'capital-auto-response', city: 'Islamabad', province: 'Islamabad Capital Territory', location: 'I-9 Industrial Area, Islamabad', email: 'ops@capitalresponse.pk', phone: '+92 51 4439821', description: 'Preventive maintenance and rapid-response service for the twin cities.', rating: 4.6 },
  { name: 'Multan Commercial Motors', slug: 'multan-commercial-motors', city: 'Multan', province: 'Punjab', location: 'Bosan Road, Multan', email: 'service@multanmotors.pk', phone: '+92 61 6512210', description: 'Commercial vehicle servicing and fleet inspections in South Punjab.', rating: 4.5 },
  { name: 'Peshawar RoadWorks', slug: 'peshawar-roadworks', city: 'Peshawar', province: 'Khyber Pakhtunkhwa', location: 'Hayatabad, Peshawar', email: 'dispatch@roadworks.pk', phone: '+92 91 5812234', description: 'Heavy vehicle diagnostics, tyres and mobile road support.', rating: 4.6 },
  { name: 'Quetta Fleet Support', slug: 'quetta-fleet-support', city: 'Quetta', province: 'Balochistan', location: 'Airport Road, Quetta', email: 'care@quettafleet.pk', phone: '+92 81 2821440', description: 'Fleet maintenance and recovery support across Quetta.', rating: 4.4 },
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
  await Promise.all([Booking.syncIndexes(), Payment.syncIndexes()]);

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

  const createdProviders = [];
  for (const data of providers) {
    const company = await Company.findOneAndUpdate(
      { slug: data.slug },
      { $set: { ...data, approvalStatus: 'approved' }, $setOnInsert: { approvedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    createdProviders.push(company);
  }
  const mainCompany = createdProviders[0];

  const owner = await User.findOneAndUpdate(
    { email: 'company@fleetos.local' },
    { $set: { company: mainCompany._id }, $setOnInsert: { name: 'Ali Murtaza', email: 'company@fleetos.local', password: companyPassword, role: 'company', phone: '+92 300 7654321', city: 'Lahore' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (!mainCompany.owner) {
    mainCompany.owner = owner._id;
    await mainCompany.save();
  }

  const serviceBlueprints = [
    ['Preventive Maintenance', 'Maintenance', 18500, 120],
    ['Brake Repair', 'Mechanical', 12000, 90],
    ['AC Service', 'Climate', 7500, 75],
    ['Engine Diagnostics', 'Diagnostics', 6000, 60],
    ['Oil & Filter Change', 'Maintenance', 4500, 45],
  ];
  for (const company of createdProviders) {
    for (let index = 0; index < serviceBlueprints.length; index += 1) {
      const [name, category, price, durationMinutes] = serviceBlueprints[index];
      await Service.updateOne(
        { company: company._id, serviceId: `SVC-${index + 1}` },
        { $setOnInsert: { company: company._id, serviceId: `SVC-${index + 1}`, name, category, price, durationMinutes, description: `${name} by verified FleetOS technicians.` } },
        { upsert: true }
      );
    }
  }

  const techNames = ['Imran Ali', 'Faisal Khan', 'Usman Raza', 'Sajid Khan', 'Nadeem Akhtar', 'Danish Shah'];
  for (let index = 0; index < techNames.length; index += 1) {
    await Technician.updateOne(
      { company: mainCompany._id, techId: `TECH-${index + 1}` },
      { $setOnInsert: { company: mainCompany._id, techId: `TECH-${index + 1}`, name: techNames[index], role: index % 2 ? 'Mechanical Technician' : 'Fleet Specialist', rating: 4.5 + (index % 4) / 10, experienceYears: 3 + index, status: index < 2 ? 'On Job' : 'Available', phone: `+92 300 55500${index}` } },
      { upsert: true }
    );
  }

  const inventoryBlueprints = [
    ['BRK-001', 'Brake Pads (Set)', 'Brakes', 6, 20, 4200],
    ['FLT-001', 'Oil Filter (Hino)', 'Filters', 8, 25, 1200],
    ['AIR-001', 'Air Filter (Isuzu)', 'Filters', 5, 20, 1800],
    ['CLT-001', 'Clutch Kit (Toyota)', 'Clutch', 3, 15, 18500],
    ['BAT-001', 'Battery 12V 100Ah', 'Electrical', 4, 10, 24000],
  ];
  for (const [sku, name, category, quantity, reorderLevel, unitCost] of inventoryBlueprints) {
    await Inventory.updateOne({ company: mainCompany._id, sku }, { $setOnInsert: { company: mainCompany._id, sku, name, category, quantity, reorderLevel, unitCost, unitPrice: Math.round(unitCost * 1.25), warehouse: 'Lahore Main' } }, { upsert: true });
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
      { $setOnInsert: { reference: 'FOS-DEMO-1001', customer: customer._id, company: mainCompany._id, service: service._id, technician: technician._id, serviceSnapshot: { name: service.name, category: service.category, price: service.price }, customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone, vehicle: { label: 'Toyota Hilux Revo G', registration: 'LEE-19-9070', make: 'Toyota', model: 'Hilux Revo' }, pricing: { serviceTotal: service.price, materialsTotal: 0, tax: 925, finalTotal: 19425 }, status: 'In Progress', statusHistory: [{ status: 'Pending', at: new Date(Date.now() - 86400000), byRole: 'customer' }, { status: 'Assigned', at: new Date(Date.now() - 43200000), byRole: 'company' }, { status: 'In Progress', at: new Date(), byRole: 'company' }], scheduledAt: new Date(Date.now() + 3600000), location: customer.address, paymentMethod: 'cash', tracking: { lat: 31.5204, lng: 74.3587, etaMinutes: 12, vehicleLabel: 'Service Van LHR-22', updatedAt: new Date() } } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const paidBooking = await Booking.findOneAndUpdate(
    { reference: 'FOS-DEMO-0997' },
    { $setOnInsert: { reference: 'FOS-DEMO-0997', customer: customer._id, company: mainCompany._id, service: service._id, serviceSnapshot: { name: 'Brake Repair', category: 'Mechanical', price: 12000 }, customerName: customer.name, customerEmail: customer.email, vehicle: { label: 'Honda City 1.5', registration: 'LEC-18-3345' }, pricing: { serviceTotal: 12000, materialsTotal: 4000, tax: 800, finalTotal: 16800 }, status: 'Paid', statusHistory: [{ status: 'Paid', at: new Date(Date.now() - 20 * 86400000), byRole: 'company' }], scheduledAt: new Date(Date.now() - 21 * 86400000), location: customer.address, paymentMethod: 'cash' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await Payment.updateOne(
    { booking: paidBooking._id },
    { $setOnInsert: { reference: 'PAY-DEMO-0997', booking: paidBooking._id, customer: customer._id, company: mainCompany._id, amount: paidBooking.pricing.finalTotal, method: 'cash', status: 'recorded', recordedAt: new Date(Date.now() - 20 * 86400000) } },
    { upsert: true }
  );
  await Review.updateOne(
    { booking: paidBooking._id },
    { $setOnInsert: { customer: customer._id, company: mainCompany._id, booking: paidBooking._id, rating: 5, comment: 'Professional team, clear updates, and the vehicle was ready on time.' } },
    { upsert: true }
  );

  const cities = Object.entries(cityGroups).flatMap(([province, names]) => names.map((name) => ({ name, province })));
  await City.bulkWrite(cities.map((city) => ({ updateOne: { filter: city, update: { $setOnInsert: city }, upsert: true } })), { ordered: false });

  console.log(`FleetOS seed ready: ${createdProviders.length} providers, ${cities.length} Pakistan cities.`);
  console.log('Customer: customer@fleetos.local / FleetCustomer1!');
  console.log('Company: company@fleetos.local / FleetCompany1!');
  return { customer, owner, mainCompany, booking };
}

module.exports = bootstrap;
