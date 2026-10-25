const test = require('node:test');
const assert = require('node:assert/strict');
const Booking = require('../src/models/Booking');
const { FULFILLMENT, FULFILLMENT_TYPES, nextStatusFor } = require('../src/config/fulfillment');
const { BUSINESS_CATEGORIES } = require('../src/config/companyWorkspace');

test('every fulfilment flow is an ordered subset of the booking lifecycle', () => {
  const lifecycle = Booking.lifecycle;
  FULFILLMENT_TYPES.forEach((type) => {
    const { flow, labels } = FULFILLMENT[type];
    assert.equal(flow[0], 'Pending');
    assert.deepEqual(flow.slice(-2), ['Completed', 'Paid'], `${type} ends with Completed → Paid so payments work`);
    const positions = flow.map((status) => lifecycle.indexOf(status));
    assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])), `${type} keeps lifecycle order`);
    flow.forEach((status) => assert.ok(labels[status], `${type} labels ${status}`));
  });
});

test('next status follows the fulfilment type', () => {
  assert.equal(nextStatusFor('onsite', 'Assigned'), 'En Route');
  assert.equal(nextStatusFor('pickup', 'Assigned'), 'In Progress');
  assert.equal(nextStatusFor('delivery', 'Arrived'), 'Completed');
  assert.equal(nextStatusFor('instore', 'Assigned'), 'Arrived');
  assert.equal(nextStatusFor('remote', 'Paid'), null);
  assert.equal(nextStatusFor(undefined, 'Pending'), 'Assigned'); // old bookings behave as on-site
});

test('every business category is complete and uses known fulfilment types', () => {
  BUSINESS_CATEGORIES.forEach((category) => {
    assert.ok(category.label && category.icon && category.description, category.value);
    assert.ok(category.fulfillment.length > 0 && category.fulfillment.every((type) => FULFILLMENT_TYPES.includes(type)), `${category.value} fulfilment`);
    assert.ok(category.starter.length >= 2, `${category.value} has a starter catalogue`);
    category.starter.forEach(([name, , price, minutes, kind]) => {
      assert.ok(name && price >= 0 && minutes >= 15 && ['service', 'product'].includes(kind), `${category.value}: ${name}`);
    });
  });
  const values = BUSINESS_CATEGORIES.map((category) => category.value);
  ['field-services', 'electronics-gaming', 'retail-products', 'food-hospitality', 'health-beauty', 'healthcare', 'auto-services', 'education', 'logistics', 'events'].forEach((value) => assert.ok(values.includes(value), value));
});
