const test = require('node:test');
const assert = require('node:assert/strict');
const Booking = require('../src/models/Booking');
const Company = require('../src/models/Company');
const User = require('../src/models/User');

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
