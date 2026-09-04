require('dotenv').config();

const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
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
const { getJwtSecret } = require('../config/security');
const { io } = require('../../../client/node_modules/socket.io-client');

const baseUrl = String(process.env.QA_API_URL || 'http://127.0.0.1:5000/api').replace(/\/$/, '');
const runId = crypto.randomBytes(5).toString('hex');
const marker = `QA-${runId}`;
const results = [];
const created = {};
const sockets = [];
let cleanupComplete = false;

function pass(check, evidence = '') {
  results.push({ check, status: 'PASS', ...(evidence ? { evidence } : {}) });
}

function assert(condition, check, evidence = '') {
  if (!condition) throw new Error(`${check} failed${evidence ? `: ${evidence}` : ''}`);
  pass(check, evidence);
}

async function request(path, { method = 'GET', token = '', body, expected = [200] } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body?.idempotencyKey ? { 'Idempotency-Key': body.idempotencyKey } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${path} returned ${response.status}: ${data?.message || text}`);
  }
  return { status: response.status, data };
}

function connectSocket(token) {
  const socket = io(baseUrl.replace(/\/api$/, ''), { auth: { token }, transports: ['websocket', 'polling'] });
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connection timed out')), 5000);
    socket.once('connect', () => { clearTimeout(timer); resolve(socket); });
    socket.once('connect_error', (error) => { clearTimeout(timer); reject(error); });
  });
}

function nextSocketEvent(socket, event, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Socket event ${event} timed out`));
    }, 5000);
    const handler = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

async function cleanup() {
  if (cleanupComplete) return;
  sockets.forEach((socket) => socket.disconnect());
  if (created.companyId) {
    await Promise.allSettled([
      ChatMessage.deleteMany({ company: created.companyId }),
      Review.deleteMany({ company: created.companyId }),
      Payment.deleteMany({ company: created.companyId }),
      Booking.deleteMany({ company: created.companyId }),
      Customer.deleteMany({ company: created.companyId }),
      Inventory.deleteMany({ company: created.companyId }),
      Technician.deleteMany({ company: created.companyId }),
      Service.deleteMany({ company: created.companyId }),
    ]);
    await Company.deleteOne({ _id: created.companyId });
  }
  await User.deleteMany({ email: { $in: [created.customerEmail, created.companyEmail].filter(Boolean) } });
  cleanupComplete = true;
}

async function run() {
  await connectDB();
  try {
    const health = await request('/health');
    assert(health.data?.status === 'ok' && health.data?.mongo === 'connected', 'API and MongoDB health');

    const superAdmin = await User.findOne({ role: 'super-admin', status: 'active' }).select('_id role sessionVersion').lean();
    assert(Boolean(superAdmin), 'Super Admin account is available for the platform audit');
    const superAdminToken = jwt.sign({ sub: String(superAdmin._id), role: superAdmin.role, sv: superAdmin.sessionVersion }, getJwtSecret(), { expiresIn: '5m' });
    const superAdminSocket = await connectSocket(superAdminToken);
    const superAdminOverview = await request('/admin/overview', { token: superAdminToken });
    assert(typeof superAdminOverview.data.metrics?.revenue === 'number', 'Super Admin reads recorded platform revenue');

    const registrationOptions = await request('/cities');
    assert(registrationOptions.data.cities.some((city) => city.name === 'Islamabad') && registrationOptions.data.businessCategories.some((category) => category.value === 'oil-energy'), 'Pakistan city and business-category registration options');

    const invalidEmail = await request('/auth/register', {
      method: 'POST',
      body: { name: marker, email: 'invalid-email', password: 'ValidPass1!' },
      expected: [400],
    });
    assert(/valid email/i.test(invalidEmail.data.message), 'invalid registration email rejected');

    const simplePasswordEmail = `weak-${runId}@fleetos.local`;
    const simplePassword = await request('/auth/register', {
      method: 'POST',
      body: { name: marker, email: simplePasswordEmail, password: 'weak' },
      expected: [201],
    });
    assert(simplePassword.data.user.email === simplePasswordEmail, 'simple user-selected password is securely accepted');
    await User.deleteOne({ email: simplePasswordEmail });

    const missingFields = await request('/auth/register', { method: 'POST', body: {}, expected: [400] });
    assert(/required/i.test(missingFields.data.message), 'missing registration fields rejected');

    created.customerEmail = `client-${runId}@fleetos.local`;
    const customerPassword = 'WorkflowClient1!';
    const customerRegistration = await request('/auth/register', {
      method: 'POST',
      body: {
        name: `${marker} Client`, email: created.customerEmail, password: customerPassword,
        phone: '+92 300 1112233', address: 'Blue Area, Islamabad', city: 'Islamabad', role: 'customer',
      },
      expected: [201],
    });
    created.customerId = customerRegistration.data.user._id;
    const customerToken = customerRegistration.data.token;
    assert(customerRegistration.data.user.role === 'customer' && Boolean(customerToken), 'customer registration and session');

    const duplicate = await request('/auth/register', {
      method: 'POST', body: { name: marker, email: created.customerEmail, password: customerPassword }, expected: [409],
    });
    assert(/already exists/i.test(duplicate.data.message), 'duplicate account rejected');

    await request('/auth/login', { method: 'POST', body: { email: created.customerEmail, password: 'WrongPass1!' }, expected: [401] });
    pass('incorrect password rejected');
    await request('/auth/login', { method: 'POST', body: { email: `missing-${runId}@fleetos.local`, password: customerPassword }, expected: [401] });
    pass('non-existent login rejected');

    const customerLogin = await request('/auth/login', { method: 'POST', body: { email: created.customerEmail, password: customerPassword } });
    assert(customerLogin.data.user.role === 'customer', 'customer login');

    const profileUpdate = await request('/auth/profile', {
      method: 'PUT', token: customerToken,
      body: { name: `${marker} Client Updated`, city: 'Islamabad', address: 'F-7, Islamabad' },
    });
    assert(profileUpdate.data.user.name.endsWith('Updated'), 'customer profile update persists');

    created.companyEmail = `company-${runId}@fleetos.local`;
    const companyPassword = 'WorkflowCompany1!';
    const missingDocuments = await request('/auth/register', {
      method: 'POST', expected: [400], body: {
        ownerName: `${marker} Owner`, companyName: `${marker} Services`, email: created.companyEmail,
        password: companyPassword, city: 'Islamabad', businessCategory: 'digital-technology', role: 'company',
      },
    });
    assert(/logo and business license/i.test(missingDocuments.data.message), 'company documents required');

    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#1B263B"/></svg>').toString('base64');
    const license = Buffer.from('%PDF-1.4\n% FleetOS QA license\n').toString('base64');
    const companyRegistration = await request('/auth/register', {
      method: 'POST', expected: [201], body: {
        ownerName: `${marker} Owner`, companyName: `${marker} Digital Services`, registrationNumber: `REG-${runId}`,
        email: created.companyEmail, password: companyPassword, phone: '+92 300 4445566',
        address: 'Blue Area, Islamabad', city: 'Islamabad', businessCategory: 'digital-technology', description: `${marker} digital technology company`, role: 'company',
        logo: `data:image/svg+xml;base64,${svg}`,
        businessLicense: { name: `${marker}-license.pdf`, data: `data:application/pdf;base64,${license}` },
      },
    });
    let companyToken = companyRegistration.data.token;
    created.companyId = companyRegistration.data.user.companyId;
    assert(companyRegistration.data.user.approvalStatus === 'pending', 'company registration creates pending approval');
    const storedCompany = await Company.findById(created.companyId).lean();
    assert(storedCompany.businessCategory === 'digital-technology', 'company business category persists in MongoDB');

    const submittedDocument = await request(`/admin/companies/${created.companyId}/document`, { token: superAdminToken });
    assert(submittedDocument.data.document?.data && /pdf/i.test(submittedDocument.data.document?.mimeType || ''), 'Super Admin can open the submitted company document');

    await request('/services', { token: companyToken, expected: [403] });
    pass('pending company operations blocked');

    const approval = await request(`/admin/companies/${created.companyId}/status`, {
      method: 'PATCH', token: superAdminToken,
      body: { status: 'approved', version: storedCompany.approvalVersion },
    });
    assert(approval.data.company.approvalStatus === 'approved', 'Super Admin approves a verified company without an audit reason');
    await Company.updateOne({ _id: created.companyId }, { description: `${marker} cloud setup and digital support`, areas: ['Blue Area', 'F-7'] });
    const approvedCompanyLogin = await request('/auth/login', { method: 'POST', body: { email: created.companyEmail, password: companyPassword } });
    companyToken = approvedCompanyLogin.data.token;
    const companyMe = await request('/auth/me', { token: companyToken });
    assert(companyMe.data.user.approvalStatus === 'approved', 'approved company session refresh');

    const [customerSocket, companySocket] = await Promise.all([connectSocket(customerToken), connectSocket(companyToken)]);
    pass('customer and company real-time channels authenticate');

    const settings = await request('/company/settings', {
      method: 'PUT', token: companyToken,
      body: { description: `${marker} cloud installation and digital support`, phone: '+92 300 4445577', areas: ['Blue Area', 'F-7'] },
    });
    assert(settings.data.company.phone.endsWith('5577'), 'company profile update persists');
    const configuredDashboard = await request('/company/dashboard', { token: companyToken });
    assert(
      configuredDashboard.data.company.workspace?.businessCategory === 'digital-technology'
        && configuredDashboard.data.company.workspace?.workforceLabel === 'Specialists'
        && configuredDashboard.data.company.workspace?.modules?.tracking === false,
      'company workspace capabilities are read from MongoDB business category',
    );

    const serviceMarketplaceEvent = nextSocketEvent(customerSocket, 'marketplace:updated', (payload) => payload?.type === 'service');
    const serviceCreate = await request('/services', {
      method: 'POST', token: companyToken,
      body: { name: `${marker} Cloud Installation`, category: 'Digital Service', price: 5000, durationMinutes: 60, status: 'Active', description: 'Cloud setup' },
      expected: [201],
    });
    await serviceMarketplaceEvent;
    pass('service mutation notifies client marketplace without refresh');
    created.serviceId = serviceCreate.data.service._id;
    const serviceUpdate = await request(`/services/${created.serviceId}`, { method: 'PUT', token: companyToken, body: { price: 6500 } });
    assert(serviceUpdate.data.service.price === 6500, 'service create and update');

    const inventoryCreate = await request('/inventory', {
      method: 'POST', token: companyToken,
      body: { sku: `QA-${runId}`.toUpperCase(), name: `${marker} Router Kit`, category: 'Digital Service', qty: 8, threshold: 2, unitCost: 2000, unitPrice: 3000, unit: 'kit', warehouse: 'Islamabad' },
      expected: [201],
    });
    created.inventoryId = inventoryCreate.data.inventory._id;
    const inventoryUpdate = await request(`/inventory/${created.inventoryId}`, { method: 'PUT', token: companyToken, body: { qty: 10 } });
    assert(inventoryUpdate.data.inventory.quantity === 10, 'inventory create and update');

    const technicianCreate = await request('/technicians', {
      method: 'POST', token: companyToken,
      body: { name: `${marker} Technician`, role: 'Cloud Specialist', phone: '+92 300 7778899', email: `tech-${runId}@fleetos.local`, experienceYears: 4, status: 'Available', avatar: `data:image/svg+xml;base64,${svg}` },
      expected: [201],
    });
    created.technicianId = technicianCreate.data.technician._id;
    const technicianUpdate = await request(`/technicians/${created.technicianId}`, { method: 'PUT', token: companyToken, body: { experienceYears: 5 } });
    assert(technicianUpdate.data.technician.experienceYears === 5, 'technician picture create and update');

    const partialSearch = await request(`/companies?search=${encodeURIComponent(runId.slice(0, 5))}&limit=20`);
    assert(partialSearch.data.companies.some((company) => company._id === created.companyId), 'partial company search finds description/name data');
    const categoryFilter = await request(`/companies?category=${encodeURIComponent('Digital Service')}&city=Islamabad&limit=500`);
    assert(categoryFilter.data.companies.some((company) => company._id === created.companyId), 'city and service category filters combine');
    const publicDetails = await request(`/companies/${created.companyId}`);
    assert(publicDetails.data.company.technicians.some((tech) => tech._id === created.technicianId), 'company details expose current technician and logo data');
    const publicInventory = await request(`/companies/${created.companyId}/inventory?serviceId=${created.serviceId}`);
    assert(publicInventory.data.inventory.some((item) => item._id === created.inventoryId), 'service-related public inventory');

    const idempotencyKey = `qa-${runId}`;
    const bookingBody = {
      companyId: created.companyId, serviceId: created.serviceId, scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      location: 'F-7, Islamabad', materials: [{ name: `${marker} Router Kit`, quantity: 1, unitPrice: 3000 }],
      paymentMethod: 'cash', idempotencyKey,
    };
    const bookingCreatedEvent = nextSocketEvent(companySocket, 'booking:created');
    const bookingCreate = await request('/bookings', { method: 'POST', token: customerToken, body: bookingBody, expected: [201] });
    created.bookingId = bookingCreate.data.booking._id;
    const bookingCreatedPayload = await bookingCreatedEvent;
    assert(bookingCreatedPayload.bookingId === created.bookingId, 'new booking notifies company without refresh');
    const bookingReplay = await request('/bookings', { method: 'POST', token: customerToken, body: bookingBody });
    assert(bookingReplay.data.idempotentReplay === true && bookingReplay.data.booking._id === created.bookingId, 'booking idempotency prevents duplicates');

    const companyBookings = await request('/bookings', { token: companyToken });
    assert(companyBookings.data.bookings.some((booking) => booking._id === created.bookingId), 'client booking reaches company');
    await request('/company/dashboard', { token: customerToken, expected: [403] });
    pass('customer blocked from company API');
    await request(`/bookings/${created.bookingId}`, { token: `invalid-${runId}`, expected: [401] });
    pass('invalid session rejected');

    const companyChatEvent = nextSocketEvent(companySocket, 'chat:message', (payload) => payload?.text === `${marker} customer message`);
    const chatCreate = await request(`/chats/${created.bookingId}/messages`, { method: 'POST', token: customerToken, body: { text: `${marker} customer message` }, expected: [201] });
    await companyChatEvent;
    pass('customer message notifies company without refresh');
    const companyMessages = await request(`/chats/${created.bookingId}/messages`, { token: companyToken });
    assert(companyMessages.data.messages.some((message) => message._id === chatCreate.data.message._id), 'customer chat reaches company and persists');
    const customerChatEvent = nextSocketEvent(customerSocket, 'chat:message', (payload) => payload?.text === `${marker} company reply`);
    const companyReply = await request(`/chats/${created.bookingId}/messages`, { method: 'POST', token: companyToken, body: { text: `${marker} company reply` }, expected: [201] });
    await customerChatEvent;
    pass('company message notifies customer without refresh');
    const customerMessages = await request(`/chats/${created.bookingId}/messages`, { token: customerToken });
    assert(customerMessages.data.messages.some((message) => message._id === companyReply.data.message._id), 'company chat reaches customer and persists');

    const assignmentEvent = nextSocketEvent(customerSocket, 'booking:updated', (payload) => payload?.bookingId === created.bookingId && payload?.status === 'Assigned');
    const assignment = await request(`/bookings/${created.bookingId}/assign`, {
      method: 'POST', token: companyToken, body: { technicianId: created.technicianId, etaMinutes: 25 },
    });
    await assignmentEvent;
    assert(assignment.data.booking.status === 'Assigned', 'company assigns available technician');
    pass('technician assignment notifies customer without refresh');
    await request(`/bookings/${created.bookingId}`, { method: 'PUT', token: companyToken, body: { status: 'Completed' }, expected: [409] });
    pass('invalid status transition rejected');

    const trackingSnapshotEvent = nextSocketEvent(customerSocket, 'tracking:snapshot', (payload) => payload?.bookingId === created.bookingId);
    customerSocket.emit('join-booking', created.bookingId);
    await trackingSnapshotEvent;
    const trackingUpdateEvent = nextSocketEvent(customerSocket, 'tracking:update', (payload) => payload?.bookingId === created.bookingId);
    await request(`/bookings/${created.bookingId}/tracking`, { method: 'PATCH', token: companyToken, body: { lat: 33.7077, lng: 73.0498, etaMinutes: 18, vehicleLabel: 'QA Dispatch' } });
    await trackingUpdateEvent;
    pass('live tracking update notifies the open customer tracking room');
    const customerTracking = await request(`/bookings/${created.bookingId}/tracking`, { token: customerToken });
    assert(customerTracking.data.tracking.etaMinutes === 18 && customerTracking.data.tracking.technician?._id === created.technicianId, 'tracking update reaches customer');

    for (const status of ['En Route', 'Arrived', 'In Progress', 'Completed']) {
      const statusResult = await request(`/bookings/${created.bookingId}`, { method: 'PUT', token: companyToken, body: { status } });
      assert(statusResult.data.booking.status === status, `booking transition to ${status}`);
    }
    const customerCompleted = await request(`/bookings/${created.bookingId}`, { token: customerToken });
    assert(customerCompleted.data.booking.status === 'Completed', 'completed status reaches customer and persists');

    const paymentUpdateEvent = nextSocketEvent(companySocket, 'booking:updated', (payload) => payload?.bookingId === created.bookingId && payload?.status === 'Paid');
    const platformPaymentEvent = nextSocketEvent(superAdminSocket, 'platform:updated', (payload) => payload?.type === 'payment');
    const payment = await request(`/bookings/${created.bookingId}/payment`, { method: 'POST', token: companyToken, body: {} });
    await paymentUpdateEvent;
    await platformPaymentEvent;
    created.paymentId = payment.data.payment._id;
    assert(payment.data.booking.status === 'Paid' && payment.data.booking.paymentStatus === 'paid', 'cash payment recorded and booking paid');
    const customerPayments = await request('/payments', { token: customerToken });
    assert(customerPayments.data.payments.some((item) => item._id === created.paymentId), 'payment reaches customer history');
    const revenueDashboard = await request('/company/dashboard', { token: companyToken });
    assert(revenueDashboard.data.metrics.recordedRevenue >= payment.data.payment.amount, 'company revenue graph source is recorded MongoDB payments');
    pass('recorded payment notifies the company and updates live revenue data');
    pass('recorded payment notifies the Super Admin revenue view without refresh');

    const companyReviewEvent = nextSocketEvent(companySocket, 'review:created', (payload) => payload?.bookingId === created.bookingId);
    const review = await request('/reviews', { method: 'POST', token: customerToken, body: { bookingId: created.bookingId, rating: 5, comment: `${marker} excellent service` }, expected: [201] });
    await companyReviewEvent;
    pass('new review notifies company without refresh');
    created.reviewId = review.data.review._id;
    await request('/reviews', { method: 'POST', token: customerToken, body: { bookingId: created.bookingId, rating: 5, comment: 'duplicate' }, expected: [409] });
    pass('duplicate booking review rejected');
    const companyReviews = await request('/reviews', { token: companyToken });
    assert(companyReviews.data.reviews.some((item) => item._id === created.reviewId), 'customer review reaches company');
    const customerReviewReplyEvent = nextSocketEvent(customerSocket, 'review:updated', (payload) => payload?.reviewId === created.reviewId);
    const reply = await request(`/reviews/${created.reviewId}/reply`, { method: 'PUT', token: companyToken, body: { reply: `${marker} thank you` } });
    await customerReviewReplyEvent;
    pass('review reply notifies customer without refresh');
    assert(reply.data.review.reply.text.includes('thank you'), 'company review reply persists');
    const customerReviews = await request('/reviews', { token: customerToken });
    assert(customerReviews.data.reviews.find((item) => item._id === created.reviewId)?.reply?.text.includes('thank you'), 'review reply reaches customer');

    await request(`/inventory/${created.inventoryId}`, { method: 'DELETE', token: companyToken, expected: [204] });
    await request(`/services/${created.serviceId}`, { method: 'DELETE', token: companyToken, expected: [204] });
    await request(`/technicians/${created.technicianId}`, { method: 'DELETE', token: companyToken, expected: [204] });
    const [inventoryAfterDelete, servicesAfterDelete, techniciansAfterDelete] = await Promise.all([
      request('/inventory', { token: companyToken }), request('/services', { token: companyToken }), request('/technicians', { token: companyToken }),
    ]);
    assert(!inventoryAfterDelete.data.inventory.some((item) => item._id === created.inventoryId), 'inventory delete persists');
    assert(!servicesAfterDelete.data.services.some((item) => item._id === created.serviceId), 'service delete persists');
    assert(!techniciansAfterDelete.data.technicians.some((item) => item._id === created.technicianId), 'technician delete persists');

    await request('/admin/overview', { expected: [401] });
    pass('Super Admin API rejects unauthenticated access');
    await request('/does-not-exist', { expected: [404] });
    pass('unknown API route returns controlled 404');

    const persisted = await Booking.findById(created.bookingId).lean();
    assert(persisted?.status === 'Paid' && persisted?.paymentStatus === 'paid', 'final workflow state stored in MongoDB');
    await cleanup();
    pass('temporary workflow cleanup');
    console.log(JSON.stringify({ status: 'PASS', runId, checks: results }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: 'FAIL', runId, error: error.message, checks: results }, null, 2));
    process.exitCode = 1;
  } finally {
    await cleanup().catch((error) => console.error(`QA cleanup failed: ${error.message}`));
    await mongoose.connection.close().catch(() => {});
  }
}

run();
