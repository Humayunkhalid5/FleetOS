require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Company = require('./models/Company');
const Booking = require('./models/Booking');
const Review = require('./models/Review');

const demoUser = {
  name: 'Alex Thompson',
  email: 'alex@fleetos.com',
  password: 'demo1234',
  phone: '+1 (555) 000-0000',
  address: '882 Modern Way, Tech Park, San Francisco, CA 94103',
  role: 'customer',
  plan: 'Premium Member',
  avatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCUJ5EIaqdsSDN9waPZS_pwz3p-_xqvr3XG-k7zUJKvSUvUzXrP4eCGi5nKdDa9vXLgdN4PN2U1cVz5ePyqh9NBDD_4_g-2IIAzjwzYKCLe-Q828-VbdE-VoPcGhq_X7Wn2MS5RWR70OjBxgiBrFZWZNlMb-tjUKn0RMatMVTkKz2zK7APCY6ygiyndUsnjWx_QPuLTqiKXrNqD0fHHLritrtlSvwxxMuDu7A_Mxv5S09njsq4mZxYoWQ',
};

const companies = [
  {
    name: 'SwiftFleet Solutions',
    slug: 'swiftfleet',
    description:
      'SwiftFleet Solutions is a leading provider of comprehensive fleet management and maintenance services. With over 15 years of industry experience, we specialize in high-efficiency turnaround for commercial vehicle fleets. Our mission is to minimize downtime and maximize operational transparency through state-of-the-art diagnostic technology and a certified team of master technicians.',
    rating: 4.8,
    reviewCount: 1240,
    heroImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBJeE45UL8UKuT4uGWd_lq3pK7QrZpG2J0KfyRilPUzEtjE0ywgMikI3S-pfNgsj7iuyifnGWB96e_KmWs_31IWMLC5eS2Ek3CoWOlYkA9UjXVd-A3NEQJb6kVP6DPnzS467WC65sWffsTkbka4VQeH0GCArJKfDNTug_ExYgKbmWdasqD1LJ3cbGnkJDATYMYGCB4FR-F8eLBmWG4gfjNzc7jZobG_NVPHlY0rPSbMQ0XVGzYW87Xwpw',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjMDOQd3UrvrebrUcxX624kDq0FEAmqmVNdcG58u-9v18fx30yrnUAG8G4Ov5a7aitulaNFUI8OpyyA7dbK0LpatGOA9H1iDNhj154uoZ0ZRQ98hatThYWFI1V61HpwQrivZRYx3UUK2rXbDnWxgYmvcG82itzN6G3SaXdfnGqNHcAgZ__eJ-kYo7O9nabbf6BZODCYe6pnAKz1PNSBu_39u3u10eAP7e184NtsWVttuZU3DxVFpebjA',
    location: 'San Francisco, CA',
    services: [
      { name: 'Standard Fleet Inspection', description: '45-point comprehensive health check', price: 89, icon: 'build' },
      { name: 'Express Oil & Filter Change', description: 'Synthetic oil upgrade included', price: 120, icon: 'oil_barrel' },
      { name: 'Diagnostic Scan & Repair', description: 'Full ECU and sensor calibration', price: 150, icon: 'electrical_services' },
    ],
    technicians: [
      { name: 'Marcus Chen', role: 'HVAC Specialist', rating: 4.9, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5AyVNVgU3fMKYE-w9lt2vv-p6eVQZIfg6Dptpx8JCaL4-6nGgTDHa_mj5-AzmY-uLMkGNTIrWAAerynADtJ0GHObDXf-Uvz2QwEZmKhyEfAT_nSugmPIYwE2PzjauysFb8q2M7FkZBzAsEoni28SOUIcacSdkVYpoGZSXujS0CoJH6dA1CzgzKSoZifnern2RmB6DcTx8hafQaxycXpqYrW7wzIfoLmmMKFf5mF_Dfl-KBvh47o2jsg' },
      { name: 'Elena Rodriguez', role: 'Master Electrician', rating: 5.0, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCiWvnkOKQReJfbwVPnaN6tu7s5397gTYSVBPMyiX6toCf8p5wo3eRuZ2QIc2TqcZrm-1vI7JyRT7oqpSWXpAdRECBDCnRGuLQM6zGzCDYi5wegUEzJG2p7E7E7jfdx9hSCUUoveU458OaY-di3G4frMSjmTJwjSznLPYXVl_zY_nMTuD0q3drMrje1gMak8VTFXTBe687naWHZTIHqBAHuyZqtzAN7B6ZysOa9vPYFnRqmNuHtlY1A' },
      { name: 'Jordan Smith', role: 'Plumbing Lead', rating: 4.7, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdSq9kds-9hvrnwo749V1I2EinNun7_8MX5BIE5-IMKUNAe4eYNSZlRYfJsQoPN6Bhr_Si7Oj9uq3XH8CcF0q8t2BSjIFBI_5A248PGaEjKqs1N1rbNOcqGh-pFfZ5qZmC7dv0k7AJ0lOUJGzjeGN4P8Z_QnnObTriizg6iqp9D11hzs6aSOcdIpfpF8Q04gH3UJwNaz_BNK0OIH9K1hLW_V9CsATPDG8NQAVE-f5Eg0eDZhdoGe4WAg' },
    ],
    gallery: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDMJiYJvoghkiL1bVptBf0EP6VeKUidSwTrOFbaZ564CoVc_T-7Q635wP_l92-zYw3ltb-qv8fhnmwnqm5gzRLXI_-D2RSxZcdcwDNwRRe9GpNrswIVzufRaHddx0ak62Q5BdKKIv3y8gxD-QVqIpqeS8kHgP_nXTft92icTsZDAG_B7LEyEI39czyA8-pXyo7J7MS57KhdVPU8yuxr01cmu5KzPX_wyVa4WEGRx544RWSkFTaIkn_NvA',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDwCyM8p6rxoebqeRVzrhlWlb5JNJXM2YE1dt2yUdPc_YU_ZEUgS3X-_lnLFL55dFyzap_9_b0iptu3Af6PM_mDDjzp_MfzUkqGLJ4YKbWKUZDlKMjz7K7RY2RzfMV_CfPidu3PP08hy_UNJSCBRmCtLgYBROdBv2jfDzlIfIFvF0eWFydg2I0J4zUkbMnweN8CGBCtc4_CssxZr8dQJ5yoj3SPZ8YiZTjt9two6RF2wTviiDR12iDRzA',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuALygENQLPaqlF0fNeHQXXHj8c6yrqh7176Heu0QJfW36n78m9ToUupVuegXUdxb0n9br_BMF-yt2dXCfowxrcdYPjE8mNYCqfDKU58IHRd_MUpy9wLui98UI5LhYnenhJ3JC4z_agt6rz6yWdepf25P4ZGqrmMw7nnH5PNT5vHL5YiwnzbZJnngTgNq0gDyiJFoy4pQwRShxOHNqssyljmtHVoF1fzGjEgIIXQHHWmYhRurhZ3KywAug',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDvhM0zx_TTXg51efCVzIlBIxXcimn9CWXESVVkxS7Xb-lN6rIZ7rJoRF6NRJTebGMSD_RJo1z1XNSLPeOd-g6p0Et77r6jN8JTmrlden_qFIMiKVUX6-IUmFpahC-kRRjTl3FugUWAHy86eUW-3UdZzGpr9K_9Z9mEleg8ehbjaHeN3cWYxtIDdEDbPaRrsdPk6wb2mvx6CmZjIiklmHcEIcgihCllA0PuqKTW4PX3AieN0QAsKInv2g',
    ],
  },
  {
    name: 'Apex Auto Care',
    slug: 'apex-auto-care',
    description:
      'Apex Auto Care provides premium on-site fleet servicing with certified technicians, mobile diagnostics, and 24/7 roadside support for commercial fleets across the Bay Area.',
    rating: 4.6,
    reviewCount: 860,
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3XvTTjcnPwU-dzLCQwlUlzW-AxJXyJEIChp-_yGPShjme07HOuIMXT6B5S0Aaf_ZE2dDuI3nehBn0HcZMu1XxF_xcpYiF6LZo94lcLKRmVGfad6viIJe-WdJxLXTJTKQ4GhWw3Kf02bvzz5pJtRBdRLA7jqLpleUFHRhNcv7Suc9Plz1KMISFY6of52QUNvr8eGIvWOHsK43JoYAgmkVUt3n2u3Ns86-xXe4RdUKb4HITB1lVGdMXNQ',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6-EDDgoY4NmhqfZoddPl3yZOkDTv8pk3BHynXguiK0RdAJX-4TkX5JQxNtlqKLfff2hs-2Hr6O3HVPAF966Am2opLXeVsSP4L4Xte9V6SPJ5xIh9txXZP346aqDBpWIrr_ZMD2QJbIcdL3frW9R9dQDAL7kIpvQzdV7x4Xum76x42b2U8kwPKPcELynoqvXN-jSEMitfcJUeTE3FjBb9koc5fZR_RFc0Q98qOvIJMWIK2a-AUAC1-sg',
    location: 'Oakland, CA',
    services: [
      { name: 'Brake Inspection & Service', description: 'Full brake pad, rotor and fluid check', price: 95, icon: 'settings' },
      { name: 'Fleet Towing & Recovery', description: '24/7 priority roadside assistance', price: 180, icon: 'local_shipping' },
    ],
    technicians: [
      { name: 'Sarah Jenkins', role: 'Electrical Specialist', rating: 4.8, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAA0s0uXF9R0oeWt_xRe1aAG-jZfenDxKMfHW9DerTGE-bnswSKIGXkLUe9IkwU10-wbmvKPCi2PHPd6RaW3_47SFBQDw8hYEns8uxgsmA1nS0H5EPr4yWP4UJxNYtiJBe7P-Q1ZMb-wnlyFb5IcNJ6LDxlwNU2rdobu2pD3Ti75777gho0sWYPxSRrPEimVwf8LEaQ9PM5r5gscMjJFEgnpPhfDVYWlClbztKaNkBoooSJrXq6WcYw-Q' },
      { name: 'David Rossi', role: 'Engine Specialist', rating: 5.0, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXDw7-G2hPyLFqCVSkM5LKif1fTrI-MifylqYOo5UmuN-wYVYBA0xIm2YUVjBbBTX_Tc_KIeJXPH6nMyVsRrkIYZPl1CbTd6ZrhIexF__V3tFxwRJHyQYDl-GuX2Nbrd-2mCRZv2lCubnVEFQ96dvaZsl08fxTnaX4Rjkh3sO7U3RiDXGAuT-HcoYP2sjFE5Ig6wR1viTfnXSlD2rxX679xzZqW2zGvUBAYOemTVZf591PVXLF0_dThw' },
    ],
    gallery: [],
  },
];

const seed = async () => {
  try {
    await connectDB();

    // Clear existing demo data
    await User.deleteMany({});
    await Company.deleteMany({});
    await Booking.deleteMany({});
    await Review.deleteMany({});
    console.log('Cleared existing data');

    // Create demo user
    const user = await User.create(demoUser);
    console.log(`Created demo user: ${user.email}`);

    // Create companies
    const createdCompanies = await Company.insertMany(companies);
    console.log(`Created ${createdCompanies.length} companies`);

    const swiftfleet = createdCompanies.find((c) => c.slug === 'swiftfleet');

    // Helper to build a date string in the near future
    const inDays = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Create a demo booking (active, in-progress with live tracking coords)
    const booking = await Booking.create({
      user: user._id,
      company: swiftfleet._id,
      technician: 'Marcus Chen',
      service: 'Express Oil & Filter Change',
      servicePrice: 120,
      materials: [
        { name: 'Premium Synthetic Oil', qty: 1, price: 45 },
        { name: 'Oil Filter (Type-A)', qty: 1, price: 18.5 },
      ],
      materialsTotal: 63.5,
      subtotal: 183.5,
      tax: 15.6,
      total: 199.1,
      status: 'in-progress',
      scheduledDate: inDays(0),
      scheduledTime: '09:30 AM - 11:00 AM',
      location: '882 Modern Way, Tech Park, San Francisco, CA 94103',
      paymentMethod: 'card',
      origin: {
        lat: 37.7749,
        lng: -122.4194,
        label: 'FleetOS Dispatch Center',
      },
      destination: {
        lat: 37.7894,
        lng: -122.3946,
        label: '882 Modern Way, Tech Park, San Francisco, CA 94103',
      },
      currentPosition: {
        lat: 37.7792,
        lng: -122.4112,
        updatedAt: new Date(),
      },
      vehicleLabel: 'Fleet Van #012',
      tracking: { stage: 'on-the-way', etaMinutes: 12 },
    });
    console.log(`Created demo booking: ${booking.reference}`);

    // Create demo reviews
    await Review.create([
      {
        user: user._id,
        booking: booking._id,
        company: swiftfleet._id,
        technician: 'Marcus Vance',
        service: 'Mobile Oil Change',
        rating: 5,
        comment: 'Fast, clean and professional. Highly recommend.',
      },
      {
        user: user._id,
        booking: booking._id,
        company: swiftfleet._id,
        technician: 'Marcus Chen',
        service: 'AC Maintenance',
        rating: 4,
        comment: 'Great service, arrived on time and fixed the issue.',
      },
    ]);
    console.log('Created demo reviews');

    console.log('Seed complete!');
    console.log('Login with: alex@fleetos.com / demo1234');

    process.exit(0);
  } catch (error) {
    console.error(`Seed error: ${error.message}`);
    process.exit(1);
  }
};

seed();

