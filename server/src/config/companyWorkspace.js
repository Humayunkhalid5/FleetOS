const { FULFILLMENT, FULFILLMENT_TYPES } = require('./fulfillment');

const allModules = { requests: true, workforce: true, inventory: true, customers: true, chat: true, reviews: true, analytics: true, tracking: true };

// One entry per kind of business FleetOS serves. A company picks its category
// at registration and the workspace switches on the modules, wording,
// fulfilment options and starter catalogue that fit how that business works.
// "Other" stays fully capable for anything that does not fit a preset.
//
// starter: [name, offering category, price PKR, minutes, kind, unit, description]
// stock:   [sku, name, category, quantity, reorder level, unit cost PKR]
const BUSINESS_CATEGORIES = [
  {
    value: 'field-services', label: 'Home services & repair', icon: 'home_repair_service',
    description: 'Plumbers, electricians, AC technicians, carpenters and cleaners who visit the customer.',
    examples: ['Plumbing', 'Electrical', 'AC repair', 'Carpentry', 'Cleaning'],
    requestLabel: 'Requests', workforceLabel: 'Technicians', offeringLabel: 'Services', inventoryLabel: 'Parts & materials',
    inventoryCategories: ['Installation materials', 'Repair parts', 'Tools & equipment', 'Safety supplies'],
    fulfillment: ['onsite'], modules: allModules,
    starter: [
      ['Pipe leak repair', 'Plumbing', 2500, 60, 'service', 'per visit', 'Find and fix leaking pipes, joints and taps.'],
      ['Water tank cleaning', 'Plumbing', 4500, 120, 'service', 'per tank', 'Drain, scrub and disinfect an overhead or underground tank.'],
      ['Electrical wiring & fault fix', 'Electrical', 3000, 90, 'service', 'per visit', 'Trace and repair short circuits, sockets and breakers.'],
      ['AC service (split unit)', 'AC & cooling', 3500, 75, 'service', 'per unit', 'Filter wash, gas pressure check and cooling test.'],
      ['AC installation (split unit)', 'AC & cooling', 8500, 150, 'service', 'per unit', 'Mounting, piping and commissioning of a new split AC.'],
      ['Deep home cleaning', 'Cleaning', 9000, 240, 'service', 'per home', 'Kitchen, bathrooms, floors and windows, team of two.'],
    ],
    stock: [['PLB-101', 'PVC pipe fittings set', 'Installation materials', 40, 10, 650], ['ELC-201', 'Circuit breaker 32A', 'Repair parts', 25, 5, 1200], ['AC-301', 'Copper pipe (per metre)', 'Installation materials', 120, 30, 900]],
  },
  {
    value: 'auto-services', label: 'Auto repair & car care', icon: 'car_repair',
    description: 'Workshops, mechanics, car washes and roadside help.',
    examples: ['Car service', 'Tyres', 'Car wash', 'Roadside help'],
    requestLabel: 'Jobs', workforceLabel: 'Mechanics', offeringLabel: 'Services & parts', inventoryLabel: 'Spare parts',
    inventoryCategories: ['Engine parts', 'Tyres & batteries', 'Oils & fluids', 'Accessories'],
    fulfillment: ['instore', 'onsite'], modules: allModules,
    starter: [
      ['Full car service', 'Car service', 7500, 150, 'service', 'per car', 'Engine oil, filters, brakes and a 30-point inspection.'],
      ['Engine oil change', 'Car service', 4800, 45, 'service', 'per car', 'Synthetic oil and oil filter replacement.'],
      ['Car wash & interior detail', 'Car wash', 2500, 90, 'service', 'per car', 'Foam wash, vacuum and dashboard polish.'],
      ['Battery jump-start (roadside)', 'Roadside help', 2000, 30, 'service', 'per call-out', 'A mechanic comes to you and gets the car running.'],
      ['Car battery 65Ah', 'Batteries', 24500, 30, 'product', 'per item', 'Maintenance-free battery with fitting.'],
    ],
    stock: [['AUT-101', 'Engine oil 4L', 'Oils & fluids', 30, 8, 5200], ['AUT-202', 'Brake pads (front set)', 'Engine parts', 18, 4, 3800], ['AUT-303', 'Car battery 65Ah', 'Tyres & batteries', 10, 3, 21000]],
  },
  {
    value: 'retail-products', label: 'Local shops & retail', icon: 'storefront',
    description: 'Grocery and general stores, clothing, home goods and other local shops.',
    examples: ['Groceries', 'General store', 'Clothing', 'Home goods'],
    requestLabel: 'Orders', workforceLabel: 'Store staff & riders', offeringLabel: 'Products', inventoryLabel: 'Product stock',
    inventoryCategories: ['Groceries', 'Household', 'Personal care', 'Packaging'],
    fulfillment: ['delivery', 'pickup'], modules: allModules,
    starter: [
      ['Weekly grocery essentials pack', 'Groceries', 6500, 30, 'product', 'per pack', 'Flour, rice, cooking oil, sugar, pulses and tea.'],
      ['Fresh fruit basket (2 kg)', 'Groceries', 1800, 30, 'product', 'per basket', 'Seasonal fruit picked the same morning.'],
      ['Cooking oil 5L', 'Groceries', 2950, 15, 'product', 'per bottle', 'Sealed bottle from a branded supplier.'],
      ['Household cleaning bundle', 'Household', 2400, 15, 'product', 'per bundle', 'Detergent, dish wash, floor cleaner and sponges.'],
      ['Baby care pack', 'Personal care', 3600, 15, 'product', 'per pack', 'Diapers, wipes and baby lotion.'],
    ],
    stock: [['RTL-101', 'Basmati rice 5 kg', 'Groceries', 60, 15, 1700], ['RTL-102', 'Cooking oil 5L', 'Groceries', 45, 10, 2600], ['RTL-201', 'Detergent 2 kg', 'Household', 50, 12, 850]],
  },
  {
    value: 'electronics-gaming', label: 'Gaming & electronics', icon: 'sports_esports',
    description: 'Gaming stores, phone and electronics shops, and device repair counters.',
    examples: ['Consoles', 'Video games', 'Phones', 'Device repair'],
    requestLabel: 'Orders & repairs', workforceLabel: 'Store staff & riders', offeringLabel: 'Products & repairs', inventoryLabel: 'Stock',
    inventoryCategories: ['Consoles', 'Games', 'Accessories', 'Phones & parts'],
    fulfillment: ['pickup', 'delivery', 'instore'], modules: allModules,
    starter: [
      ['PlayStation 5 Slim (disc)', 'Consoles', 159999, 15, 'product', 'per item', 'Brand new, sealed, with one-year shop warranty.'],
      ['Xbox Series S 512 GB', 'Consoles', 99999, 15, 'product', 'per item', 'Brand new, sealed.'],
      ['DualSense wireless controller', 'Accessories', 21999, 15, 'product', 'per item', 'Original Sony controller.'],
      ['EA Sports FC (PS5)', 'Games', 14999, 15, 'product', 'per item', 'Physical disc, latest edition.'],
      ['Console HDMI port repair', 'Device repair', 6500, 120, 'service', 'per device', 'Replace a damaged HDMI port; 30-day repair warranty.'],
      ['Phone screen replacement', 'Device repair', 8000, 60, 'service', 'per device', 'Quality replacement screen fitted while you wait.'],
    ],
    stock: [['GAM-101', 'PlayStation 5 Slim', 'Consoles', 6, 2, 148000], ['GAM-201', 'DualSense controller', 'Accessories', 20, 5, 18500], ['GAM-301', 'HDMI port module', 'Phones & parts', 15, 4, 1800]],
  },
  {
    value: 'food-hospitality', label: 'Restaurants & food', icon: 'restaurant',
    description: 'Restaurants, cafés, bakeries, home kitchens and caterers.',
    examples: ['Restaurants', 'Cafés', 'Bakeries', 'Catering'],
    requestLabel: 'Orders & reservations', workforceLabel: 'Service staff & riders', offeringLabel: 'Menu', inventoryLabel: 'Kitchen stock',
    inventoryCategories: ['Ingredients', 'Packaging', 'Beverages', 'Service supplies'],
    fulfillment: ['delivery', 'pickup', 'instore'], modules: allModules,
    starter: [
      ['Chicken biryani (family)', 'Main course', 2200, 35, 'product', 'per platter', 'Serves four, with raita and salad.'],
      ['Chicken karahi (1 kg)', 'Main course', 2800, 40, 'product', 'per kg', 'Cooked fresh to order.'],
      ['Beef burger meal', 'Fast food', 1150, 20, 'product', 'per meal', 'Burger, fries and a soft drink.'],
      ['Table reservation (4 guests)', 'Dine-in', 0, 90, 'service', 'per table', 'Reserve a table; you pay for what you order.'],
      ['Event catering (per head)', 'Catering', 1800, 240, 'service', 'per guest', 'Two mains, rice, dessert and service staff.'],
    ],
    stock: [['FD-101', 'Basmati rice 25 kg', 'Ingredients', 10, 3, 8200], ['FD-201', 'Takeaway boxes (100)', 'Packaging', 30, 8, 1400], ['FD-301', 'Soft drinks 1.5L', 'Beverages', 48, 12, 180]],
  },
  {
    value: 'health-beauty', label: 'Salons, spas & wellness', icon: 'spa',
    description: 'Salons, barbers, spas, fitness trainers and beauticians.',
    examples: ['Haircut', 'Spa', 'Bridal makeup', 'Fitness'],
    requestLabel: 'Appointments', workforceLabel: 'Stylists & practitioners', offeringLabel: 'Treatments & packages', inventoryLabel: 'Salon stock',
    inventoryCategories: ['Consumables', 'Retail products', 'Equipment', 'Care supplies'],
    fulfillment: ['instore', 'onsite'], modules: allModules,
    starter: [
      ['Haircut & styling', 'Hair', 1500, 45, 'service', 'per person', 'Wash, cut and blow-dry.'],
      ['Facial (whitening)', 'Skin care', 3500, 60, 'service', 'per session', 'Deep cleanse, mask and massage.'],
      ['Full body massage', 'Spa', 5500, 75, 'service', 'per session', 'Relaxing oil massage by a certified therapist.'],
      ['Bridal makeup (home visit)', 'Makeup', 35000, 180, 'service', 'per booking', 'Makeup, hairstyling and dupatta setting at your home.'],
      ['Personal training session', 'Fitness', 3000, 60, 'service', 'per session', 'One-to-one workout with a trainer.'],
    ],
    stock: [['SLN-101', 'Hair colour kit', 'Consumables', 25, 6, 1300], ['SLN-201', 'Facial kit', 'Consumables', 20, 5, 1600], ['SLN-301', 'Massage oil 1L', 'Care supplies', 12, 3, 2200]],
  },
  {
    value: 'healthcare', label: 'Clinics & pharmacies', icon: 'local_pharmacy',
    description: 'Clinics, labs, pharmacies and home nursing.',
    examples: ['Doctor visit', 'Lab tests', 'Medicines', 'Home nursing'],
    requestLabel: 'Appointments & orders', workforceLabel: 'Doctors & staff', offeringLabel: 'Consultations & products', inventoryLabel: 'Medicines & supplies',
    inventoryCategories: ['Medicines', 'Medical devices', 'Lab supplies', 'Personal care'],
    fulfillment: ['instore', 'delivery', 'remote', 'onsite'], modules: allModules,
    starter: [
      ['General physician consultation', 'Consultation', 2000, 20, 'service', 'per visit', 'In-clinic check-up with a registered doctor.'],
      ['Online video consultation', 'Consultation', 1500, 20, 'service', 'per session', 'Video call with a doctor and an e-prescription.'],
      ['Home blood sample collection', 'Lab tests', 1200, 30, 'service', 'per visit', 'A phlebotomist collects samples at home; report online.'],
      ['Blood pressure monitor', 'Medical devices', 7500, 15, 'product', 'per item', 'Digital upper-arm monitor.'],
      ['Monthly medicine refill delivery', 'Pharmacy', 0, 30, 'service', 'per order', 'Upload a prescription; pay for the medicines on delivery.'],
    ],
    stock: [['MED-101', 'Paracetamol 500 mg (strip)', 'Medicines', 200, 50, 30], ['MED-201', 'BP monitor', 'Medical devices', 8, 2, 6200], ['MED-301', 'Sample collection kit', 'Lab supplies', 60, 15, 250]],
  },
  {
    value: 'education', label: 'Tutoring & training', icon: 'school',
    description: 'Tutors, academies, language and skills training.',
    examples: ['Home tuition', 'Online classes', 'Test prep', 'Skills courses'],
    requestLabel: 'Enrolments', workforceLabel: 'Tutors', offeringLabel: 'Courses & sessions', inventoryLabel: 'Learning materials',
    inventoryCategories: ['Books', 'Workbooks', 'Stationery', 'Equipment'],
    fulfillment: ['remote', 'onsite', 'instore'], modules: { ...allModules, inventory: false },
    starter: [
      ['Home tuition (Matric maths)', 'School tutoring', 12000, 60, 'service', 'per month', 'Three sessions a week at your home.'],
      ['Online O/A-Level physics', 'School tutoring', 15000, 60, 'service', 'per month', 'Live online classes with notes and past papers.'],
      ['IELTS preparation course', 'Test prep', 25000, 90, 'service', 'per course', 'Six weeks, all four modules, with mock tests.'],
      ['Spoken English (beginner)', 'Languages', 8000, 60, 'service', 'per month', 'Small-group conversation practice.'],
      ['Web development bootcamp', 'Skills', 45000, 120, 'service', 'per course', 'Twelve weeks of HTML, CSS, JavaScript and React.'],
    ],
    stock: [],
  },
  {
    value: 'logistics', label: 'Courier & moving', icon: 'local_shipping',
    description: 'Couriers, parcel delivery, house shifting and freight.',
    examples: ['Parcel delivery', 'House shifting', 'Freight'],
    requestLabel: 'Shipments', workforceLabel: 'Drivers', offeringLabel: 'Delivery services', inventoryLabel: 'Packing supplies',
    inventoryCategories: ['Boxes', 'Packing material', 'Equipment', 'Fuel'],
    fulfillment: ['onsite'], modules: allModules,
    starter: [
      ['Same-day parcel (within city)', 'Courier', 450, 180, 'service', 'per parcel', 'Collected from your door and delivered the same day.'],
      ['Intercity parcel (up to 5 kg)', 'Courier', 950, 1440, 'service', 'per parcel', 'Door-to-door in 1–2 working days.'],
      ['House shifting (2-bed)', 'Moving', 28000, 360, 'service', 'per move', 'Truck, packing and a crew of four.'],
      ['Mini-truck hire (half day)', 'Freight', 9000, 240, 'service', 'per booking', 'Shehzore with driver for local loads.'],
    ],
    stock: [['LOG-101', 'Moving boxes (large)', 'Boxes', 150, 40, 220], ['LOG-201', 'Bubble wrap roll', 'Packing material', 30, 8, 1500]],
  },
  {
    value: 'events', label: 'Events & photography', icon: 'celebration',
    description: 'Event planners, photographers, decorators and sound and lighting.',
    examples: ['Wedding photography', 'Decor', 'Sound & lights'],
    requestLabel: 'Bookings', workforceLabel: 'Crew', offeringLabel: 'Packages', inventoryLabel: 'Equipment',
    inventoryCategories: ['Cameras', 'Lighting', 'Decor', 'Sound'],
    fulfillment: ['onsite', 'instore'], modules: allModules,
    starter: [
      ['Wedding photography (full day)', 'Photography', 85000, 600, 'service', 'per event', 'Two photographers, edited album and highlights video.'],
      ['Birthday party decor', 'Decor', 18000, 180, 'service', 'per event', 'Balloons, backdrop and table setup.'],
      ['Sound & lighting setup', 'Sound & lights', 25000, 300, 'service', 'per event', 'Speakers, DJ console and stage lights with an operator.'],
      ['Studio portrait session', 'Photography', 6000, 60, 'service', 'per session', 'Ten edited portraits from our studio.'],
    ],
    stock: [['EVT-101', 'LED par lights', 'Lighting', 24, 6, 9500], ['EVT-201', 'Backdrop stand', 'Decor', 6, 2, 12000]],
  },
  {
    value: 'professional-services', label: 'Professional services', icon: 'work',
    description: 'Accountants, lawyers, consultants and agencies.',
    examples: ['Tax filing', 'Legal advice', 'Consulting'],
    requestLabel: 'Client work', workforceLabel: 'Consultants', offeringLabel: 'Service packages', inventoryLabel: 'Business supplies',
    inventoryCategories: ['Office supplies', 'Client materials', 'Equipment', 'Service add-ons'],
    fulfillment: ['remote', 'instore'], modules: { ...allModules, inventory: false },
    starter: [
      ['Income tax return filing', 'Tax', 5000, 60, 'service', 'per return', 'Salaried or business return filed with FBR.'],
      ['Company registration (SECP)', 'Corporate', 25000, 240, 'service', 'per company', 'Name reservation, incorporation and NTN.'],
      ['Legal consultation', 'Legal', 6000, 45, 'service', 'per session', 'In-office or video consultation with an advocate.'],
      ['Monthly bookkeeping', 'Accounting', 15000, 480, 'service', 'per month', 'Ledgers, reconciliations and monthly reports.'],
    ],
    stock: [],
  },
  {
    value: 'digital-technology', label: 'Digital & IT services', icon: 'devices',
    description: 'Web and app developers, IT support, CCTV and networking.',
    examples: ['Websites', 'IT support', 'CCTV', 'Networking'],
    requestLabel: 'Projects & requests', workforceLabel: 'Specialists', offeringLabel: 'Digital services', inventoryLabel: 'Equipment & licenses',
    inventoryCategories: ['Devices & equipment', 'Software & licenses', 'Digital add-ons', 'Support materials'],
    fulfillment: ['remote', 'onsite'], modules: allModules,
    starter: [
      ['Business website (5 pages)', 'Web development', 60000, 2400, 'service', 'per project', 'Responsive site with contact form and hosting setup.'],
      ['IT support visit', 'IT support', 3500, 90, 'service', 'per visit', 'PC, printer, Wi-Fi and email troubleshooting on site.'],
      ['CCTV installation (4 cameras)', 'Security', 45000, 300, 'service', 'per installation', 'Cameras, DVR, cabling and mobile viewing.'],
      ['Monthly social media management', 'Marketing', 30000, 600, 'service', 'per month', 'Twelve posts, ads setup and a monthly report.'],
    ],
    stock: [['DIG-101', 'HD CCTV camera', 'Devices & equipment', 40, 10, 5200], ['DIG-201', '8-port network switch', 'Devices & equipment', 12, 3, 4800]],
  },
  {
    value: 'oil-energy', label: 'Fuel & energy', icon: 'local_gas_station',
    description: 'LPG suppliers, fuel delivery, solar and generator services.',
    examples: ['LPG cylinders', 'Solar installation', 'Generator service'],
    requestLabel: 'Supply orders', workforceLabel: 'Field staff', offeringLabel: 'Products & supply services', inventoryLabel: 'Supply inventory',
    inventoryCategories: ['Fuel products', 'Lubricants', 'Cylinders & containers', 'Safety equipment'],
    fulfillment: ['delivery', 'onsite'], modules: allModules,
    starter: [
      ['LPG cylinder refill (11.8 kg)', 'LPG', 3400, 60, 'product', 'per cylinder', 'Delivered and connected at your door.'],
      ['Solar system 5 kW (installed)', 'Solar', 850000, 960, 'service', 'per system', 'Panels, hybrid inverter, structure and net-metering paperwork.'],
      ['Generator service', 'Generators', 6500, 120, 'service', 'per visit', 'Oil, filters, spark plug and load test.'],
      ['Diesel delivery (per litre)', 'Fuel', 285, 120, 'product', 'per litre', 'Bulk diesel delivered to sites, minimum 200 L.'],
    ],
    stock: [['ENR-101', 'LPG cylinder 11.8 kg', 'Cylinders & containers', 40, 10, 2900], ['ENR-201', 'Generator oil 4L', 'Lubricants', 20, 5, 4300]],
  },
  {
    value: 'other', label: 'Other business', icon: 'category',
    description: 'Anything else: a fully configurable workspace.',
    examples: ['Custom services', 'Products'],
    requestLabel: 'Requests', workforceLabel: 'Staff', offeringLabel: 'Offers', inventoryLabel: 'Company inventory',
    inventoryCategories: ['Products', 'Supplies', 'Equipment', 'Other items'],
    fulfillment: [...FULFILLMENT_TYPES], modules: allModules,
    starter: [['Standard service', 'General', 2000, 60, 'service', 'per job', 'Describe what is included.'], ['Standard product', 'General', 1000, 15, 'product', 'per item', 'Describe the product.']],
    stock: [],
  },
];

const byValue = new Map(BUSINESS_CATEGORIES.map((category) => [category.value, category]));
const categoryOf = (value) => byValue.get(value) || byValue.get('field-services');

/** Fulfilment options a company offers: its own choice within what its category allows. */
function fulfillmentOptionsFor(company) {
  const allowed = categoryOf(company?.businessCategory).fulfillment;
  const chosen = (company?.fulfillmentOptions || []).filter((type) => allowed.includes(type));
  return chosen.length ? chosen : allowed;
}

function getWorkspace(company) {
  const category = categoryOf(company?.businessCategory);
  const fulfillment = fulfillmentOptionsFor(company);
  return {
    businessCategory: category.value,
    businessCategoryLabel: category.label,
    businessCategoryIcon: category.icon,
    requestLabel: category.requestLabel,
    workforceLabel: category.workforceLabel,
    offeringLabel: category.offeringLabel,
    inventoryLabel: category.inventoryLabel,
    inventoryCategories: category.inventoryCategories,
    fulfillment,
    allowedFulfillment: category.fulfillment,
    deliveryFee: Number(company?.deliveryFee || 0),
    // Live location only matters when someone travels: on-site visits or deliveries.
    modules: { ...allModules, ...category.modules, tracking: fulfillment.some((type) => FULFILLMENT[type].tracking) },
  };
}

/** Public metadata for registration, filters and the marketplace. */
const publicCategories = () => BUSINESS_CATEGORIES.map(({ value, label, icon, description, examples, fulfillment, offeringLabel }) => ({ value, label, icon, description, examples, fulfillment, offeringLabel }));

module.exports = { BUSINESS_CATEGORIES, getWorkspace, categoryOf, fulfillmentOptionsFor, publicCategories, hasBusinessCategory: (value) => byValue.has(value) };
