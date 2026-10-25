const test = require('node:test');
const assert = require('node:assert/strict');
const Booking = require('../src/models/Booking');
const Company = require('../src/models/Company');
const User = require('../src/models/User');
const { getWorkspace, hasBusinessCategory } = require('../src/config/companyWorkspace');

test('booking lifecycle is explicit and terminal states are last', () => {
  assert.deepEqual(Booking.lifecycle, ['Pending', 'Assigned', 'En Route', 'Arrived', 'In Progress', 'Completed', 'Paid', 'Cancelled']);
});

test('booking idempotency uses a partial unique index', () => {
  const index = Booking.schema.indexes().find(([keys]) => keys.customer === 1 && keys.idempotencyKey === 1);
  assert.ok(index);
  assert.equal(index[1].unique, true);
  assert.equal(index[1].partialFilterExpression.idempotencyKey.$type, 'string');
});

test('public roles and company approval states are constrained by schemas', () => {
  assert.deepEqual(User.schema.path('role').enumValues, ['customer', 'company', 'super-admin']);
  assert.deepEqual(Company.schema.path('approvalStatus').enumValues, ['pending', 'approved', 'rejected', 'suspended']);
});

test('company workspace capabilities match the selected business model', () => {
  const retail = getWorkspace({ businessCategory: 'retail-products' });
  const professional = getWorkspace({ businessCategory: 'professional-services' });
  const digital = getWorkspace({ businessCategory: 'digital-technology' });

  assert.equal(retail.requestLabel, 'Orders');
  assert.deepEqual(retail.fulfillment, ['delivery', 'pickup']);
  assert.equal(retail.modules.tracking, true); // deliveries are tracked
  assert.equal(professional.modules.inventory, false);
  assert.equal(professional.modules.tracking, false); // remote and in-office only
  assert.equal(digital.workforceLabel, 'Specialists');
  // A business can narrow its options, but only within its category.
  assert.deepEqual(getWorkspace({ businessCategory: 'retail-products', fulfillmentOptions: ['pickup'] }).fulfillment, ['pickup']);
  assert.equal(getWorkspace({ businessCategory: 'retail-products', fulfillmentOptions: ['pickup'] }).modules.tracking, false);
  assert.deepEqual(getWorkspace({ businessCategory: 'retail-products', fulfillmentOptions: ['remote'] }).fulfillment, ['delivery', 'pickup']);
  assert.ok(hasBusinessCategory('health-beauty'));
  assert.equal(hasBusinessCategory('not-a-real-category'), false);
});
