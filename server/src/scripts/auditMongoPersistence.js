require('dotenv').config();

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Company = require('../models/Company');
const Service = require('../models/Service');
const Inventory = require('../models/Inventory');
const Technician = require('../models/Technician');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const ChatMessage = require('../models/ChatMessage');
const Customer = require('../models/Customer');

const runId = crypto.randomBytes(5).toString('hex');
const marker = `AUDIT-${runId}`;
const emailBase = `audit-${runId}@fleetos.local`;
const results = [];
const created = {
  users: [],
  companies: [],
  services: [],
  inventory: [],
  technicians: [],
  bookings: [],
  payments: [],
  reviews: [],
  chats: [],
  customers: [],
};

function pass(name, details = {}) {
  results.push({ check: name, status: 'PASS', ...details });
}

function assert(condition, name, details = {}) {
  if (!condition) {
    const error = new Error(`${name} failed`);
    error.details = details;
    throw error;
  }
  pass(name, details);
}

async function cleanup() {
  await Promise.allSettled([
    ChatMessage.deleteMany({ _id: { $in: created.chats } }),
    Review.deleteMany({ _id: { $in: created.reviews } }),
    Payment.deleteMany({ _id: { $in: created.payments } }),
    Booking.deleteMany({ _id: { $in: created.bookings } }),
    Customer.deleteMany({ _id: { $in: created.customers } }),
    Inventory.deleteMany({ _id: { $in: created.inventory } }),
    Technician.deleteMany({ _id: { $in: created.technicians } }),
    Service.deleteMany({ _id: { $in: created.services } }),
    Company.deleteMany({ _id: { $in: created.companies } }),
    User.deleteMany({ _id: { $in: created.users } }),
  ]);
}

async function run() {
  const connection = await connectDB();
  try {
    const password = await bcrypt.hash('AuditTest1!', 12);

    const customer = await User.create({
      name: `${marker} Client`,
      email: `client-${emailBase}`,
      password,
      role: 'customer',
      phone: '+92 300 9000001',
      city: 'Islamabad',
      address: 'Blue Area, Islamabad',
    });
    created.users.push(customer._id);

    const owner = await User.create({
      name: `${marker} Owner`,
      email: `company-${emailBase}`,
      password,
      role: 'company',
      phone: '+92 300 9000002',
      city: 'Islamabad',
    });
    created.users.push(owner._id);

    const company = await Company.create({
      name: `${marker} Company`,
      slug: `audit-${runId}-company`,
      owner: owner._id,
      email: owner.email,
      phone: owner.phone,
      city: 'Islamabad',
      province: 'Islamabad Capital Territory',
      location: 'Blue Area, Islamabad',
      areas: ['Blue Area', 'F-7'],
      description: 'Temporary audit company for Mongo persistence verification.',
      logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=',
      approvalStatus: 'approved',
      approvedAt: new Date(),
    });
    created.companies.push(company._id);
    owner.company = company._id;
    await owner.save();

    const visibleCompany = await Company.findOne({ slug: company.slug, approvalStatus: 'approved' }).lean();
    assert(Boolean(visibleCompany), 'company create/read visibility', { company: company.slug });

    const service = await Service.create({
      company: company._id,
      serviceId: `SVC-${runId}`,
      name: `${marker} Installation`,
      category: 'Installation',
      price: 5500,
      durationMinutes: 45,
      status: 'Active',
      description: 'Created by audit script.',
    });
    created.services.push(service._id);
    await Service.updateOne({ _id: service._id }, { price: 6500 });
    assert((await Service.findById(service._id).lean()).price === 6500, 'service create/read/update');

    const item = await Inventory.create({
      company: company._id,
      sku: `AUD-${runId}`.toUpperCase(),
      name: `${marker} Item`,
      category: 'Installation',
      quantity: 4,
      reorderLevel: 1,
      unitCost: 1000,
      unitPrice: 1500,
      warehouse: 'Islamabad Main',
    });
    created.inventory.push(item._id);
    await Inventory.updateOne({ _id: item._id }, { quantity: 9 });
    assert((await Inventory.findById(item._id).lean()).quantity === 9, 'inventory create/read/update');

    const staff = await Technician.create({
      company: company._id,
      techId: `TECH-${runId}`,
      name: `${marker} Staff`,
      role: 'Support Specialist',
      phone: '+92 300 9000003',
      status: 'Available',
    });
    created.technicians.push(staff._id);
    await Technician.updateOne({ _id: staff._id }, { status: 'On Job' });
    assert((await Technician.findById(staff._id).lean()).status === 'On Job', 'staff create/read/update');

    const booking = await Booking.create({
      reference: `FOS-AUDIT-${runId.toUpperCase()}`,
      customer: customer._id,
      company: company._id,
      service: service._id,
      technician: staff._id,
      serviceSnapshot: { name: service.name, category: service.category, price: service.price },
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      vehicle: { label: 'Client service request' },
      pricing: { serviceTotal: service.price, materialsTotal: 1500, tax: 400, finalTotal: 8400 },
      status: 'Completed',
      statusHistory: [{ status: 'Completed', at: new Date(), byRole: 'company', note: marker }],
      scheduledAt: new Date(),
      location: customer.address,
      paymentMethod: 'cash',
      paymentStatus: 'unpaid',
    });
    created.bookings.push(booking._id);
    assert(Boolean(await Booking.findOne({ reference: booking.reference }).lean()), 'booking create/read');

    const payment = await Payment.create({
      reference: `PAY-AUDIT-${runId.toUpperCase()}`,
      booking: booking._id,
      customer: customer._id,
      company: company._id,
      amount: booking.pricing.finalTotal,
      method: 'cash',
      status: 'recorded',
      recordedAt: new Date(),
    });
    created.payments.push(payment._id);
    assert(Boolean(await Payment.findOne({ booking: booking._id, status: 'recorded' }).lean()), 'payment create/read');

    const review = await Review.create({
      customer: customer._id,
      company: company._id,
      booking: booking._id,
      rating: 5,
      comment: `${marker} review`,
    });
    created.reviews.push(review._id);
    await Review.updateOne({ _id: review._id }, { 'reply.text': 'Thanks', 'reply.repliedAt': new Date() });
    assert((await Review.findById(review._id).lean()).reply.text === 'Thanks', 'review create/read/update');

    const chat = await ChatMessage.create({
      booking: booking._id,
      company: company._id,
      customer: customer._id,
      sender: customer._id,
      senderRole: 'customer',
      text: `${marker} chat message`,
    });
    created.chats.push(chat._id);
    await ChatMessage.updateOne({ _id: chat._id }, { readAt: new Date() });
    assert(Boolean((await ChatMessage.findById(chat._id).lean()).readAt), 'chat create/read/update');

    const companyCustomer = await Customer.create({
      company: company._id,
      user: customer._id,
      customerId: `CUST-${runId.toUpperCase()}`,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      status: 'Active',
    });
    created.customers.push(companyCustomer._id);
    await Customer.updateOne({ _id: companyCustomer._id }, { status: 'Inactive' });
    assert((await Customer.findById(companyCustomer._id).lean()).status === 'Inactive', 'company customer create/read/update');

    const serviceDelete = await Service.findOneAndDelete({ _id: service._id, company: company._id });
    assert(Boolean(serviceDelete) && !(await Service.exists({ _id: service._id })), 'service delete');
    created.services = created.services.filter((id) => String(id) !== String(service._id));

    const inventoryDelete = await Inventory.findOneAndDelete({ _id: item._id, company: company._id });
    assert(Boolean(inventoryDelete) && !(await Inventory.exists({ _id: item._id })), 'inventory delete');
    created.inventory = created.inventory.filter((id) => String(id) !== String(item._id));

    const staffDelete = await Technician.findOneAndDelete({ _id: staff._id, company: company._id });
    assert(Boolean(staffDelete) && !(await Technician.exists({ _id: staff._id })), 'staff delete');
    created.technicians = created.technicians.filter((id) => String(id) !== String(staff._id));

    const clientPayloadCompanies = await Company.find({ approvalStatus: 'approved' }).sort({ rating: -1, name: 1 }).limit(5000).lean();
    assert(clientPayloadCompanies.some((row) => String(row._id) === String(company._id)), 'client company list includes low-rating real company', { checkedLimit: 5000 });

    await cleanup();
    pass('temporary audit cleanup');

    console.log(JSON.stringify({
      database: connection.name,
      runId,
      status: 'PASS',
      checks: results,
    }, null, 2));
  } catch (error) {
    await cleanup();
    console.error(JSON.stringify({
      database: mongoose.connection.name,
      runId,
      status: 'FAIL',
      failed: error.message,
      details: error.details || {},
      checks: results,
    }, null, 2));
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
}

run();
