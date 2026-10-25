require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Company = require('../models/Company');
const { coverImageFor, GENERATED_COVER } = require('../data/coverImages');
const Service = require('../models/Service');
const Inventory = require('../models/Inventory');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

const services = [
  ['Premium Installation Package', 'Installation', 18500, 120],
  ['Repair & Support Visit', 'Repair & Support', 12000, 90],
  ['Product Demo Session', 'Retail Product', 7500, 75],
  ['Digital Setup Service', 'Digital Service', 6000, 60],
  ['Basic Service Request', 'Professional Service', 4500, 45],
  ['Home Visit Service', 'Home Service', 8500, 90],
  ['Business Operations Service', 'Business Service', 15000, 120],
];

const inventoryItems = [
  ['INS-001', 'Installation Starter Kit', 'Installation', 16, 6, 5200],
  ['RTL-001', 'Premium Product Add-on', 'Retail Product', 20, 8, 1450],
  ['SUP-001', 'Support Visit Toolkit', 'Repair & Support', 14, 6, 4200],
  ['BUS-001', 'Business Setup Pack', 'Business Service', 12, 5, 3100],
  ['DIG-001', 'Digital Configuration Report', 'Digital Service', 50, 10, 900],
];

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fleetos';
  await mongoose.connect(uri);

  const companies = await Company.find({ approvalStatus: 'approved' });
  for (const company of companies) {
    company.name = String(company.name || '')
      .replace(/Rapid Fleet Care/gi, 'Service Market')
      .replace(/Trusted Motors Hub/gi, 'Product Hub')
      .replace(/Fleet Care/gi, 'Product Hub')
      .replace(/Commercial Motors/gi, 'Smart Services')
      .replace(/Roadworks/gi, 'Service Market')
      .replace(/Fleet Support/gi, 'Digital & Retail')
      .trim();
    if (!company.heroImage || GENERATED_COVER.test(company.heroImage)) company.heroImage = coverImageFor(company.businessCategory, company.slug, company.name);
    if (!company.description || /fleet|vehicle|workshop|auto|brake|tyre|tire|roadworks/i.test(company.description)) {
      company.description = `Verified company offering products, services, add-ons, support, and client request handling in ${company.city || 'Pakistan'}.`;
    }
    await company.save();

    for (let index = 0; index < services.length; index += 1) {
      const [name, category, price, durationMinutes] = services[index];
      await Service.updateOne(
        { company: company._id, serviceId: `SVC-${index + 1}` },
        {
          $set: { name, category, price, durationMinutes, description: `${name} by verified company staff.`, active: true },
          $setOnInsert: { company: company._id, serviceId: `SVC-${index + 1}` },
        },
        { upsert: true }
      );
    }

    for (const [sku, name, category, quantity, reorderLevel, unitCost] of inventoryItems) {
      await Inventory.updateOne(
        { company: company._id, sku },
        {
          $set: {
            name,
            category,
            quantity,
            reorderLevel,
            unitCost,
            unitPrice: Math.round(unitCost * 1.25),
            warehouse: `${company.city || 'Pakistan'} Main`,
          },
          $setOnInsert: { company: company._id, sku },
        },
        { upsert: true }
      );
    }
  }

  await Booking.updateMany(
    { 'vehicle.label': /Toyota|Honda|Hilux|fleet vehicle|commercial motor|workshop/i },
    { $set: { 'vehicle.label': 'Client service request', 'vehicle.registration': 'REQ-DEMO', 'tracking.vehicleLabel': 'Assigned service staff' } }
  );
  await Booking.updateOne(
    { reference: 'FOS-DEMO-0997' },
    { $set: { serviceSnapshot: { name: 'Repair & Support Visit', category: 'Repair & Support', price: 12000 } } }
  );
  await Review.updateMany(
    { comment: /vehicle/i },
    { $set: { comment: 'Professional team, clear updates, and the service was completed on time.' } }
  );

  const result = {
    companies: companies.length,
    heroImages: await Company.countDocuments({ approvalStatus: 'approved', heroImage: /^(https?:|data:image)/ }),
    serviceSample: (await Service.findOne({ name: 'Premium Installation Package' }).lean())?.name || null,
    itemSample: (await Inventory.findOne({ name: 'Installation Starter Kit' }).lean())?.name || null,
  };
  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
