// How a job reaches the customer. Every type walks a subset of the canonical
// booking statuses (so payments, analytics and the admin pipeline keep one
// vocabulary) and gives those statuses wording that fits the business.
// Mirrored for the UI in client/src/constants/fulfillment.js.
const FULFILLMENT = {
  onsite: {
    label: 'On-site visit',
    description: 'Staff travel to the customer’s address.',
    icon: 'home_repair_service',
    needsAddress: true,
    tracking: true,
    requiresStaff: true,
    flow: ['Pending', 'Assigned', 'En Route', 'Arrived', 'In Progress', 'Completed', 'Paid'],
    labels: { Pending: 'Requested', Assigned: 'Staff assigned', 'En Route': 'On the way', Arrived: 'Arrived', 'In Progress': 'Work in progress', Completed: 'Completed', Paid: 'Paid' },
  },
  delivery: {
    label: 'Delivery',
    description: 'The business delivers the order to the customer.',
    icon: 'local_shipping',
    needsAddress: true,
    tracking: true,
    requiresStaff: false,
    flow: ['Pending', 'Assigned', 'En Route', 'Arrived', 'Completed', 'Paid'],
    labels: { Pending: 'Order placed', Assigned: 'Accepted · preparing', 'En Route': 'Out for delivery', Arrived: 'Delivered', Completed: 'Order closed', Paid: 'Paid' },
  },
  pickup: {
    label: 'Store pickup',
    description: 'The customer collects the order from the business.',
    icon: 'shopping_bag',
    needsAddress: false,
    tracking: false,
    requiresStaff: false,
    flow: ['Pending', 'Assigned', 'In Progress', 'Completed', 'Paid'],
    labels: { Pending: 'Order placed', Assigned: 'Accepted', 'In Progress': 'Preparing', Completed: 'Ready / collected', Paid: 'Paid' },
  },
  instore: {
    label: 'Visit the business',
    description: 'An appointment or reservation at the business premises.',
    icon: 'storefront',
    needsAddress: false,
    tracking: false,
    requiresStaff: false,
    flow: ['Pending', 'Assigned', 'Arrived', 'In Progress', 'Completed', 'Paid'],
    labels: { Pending: 'Requested', Assigned: 'Confirmed', Arrived: 'Checked in', 'In Progress': 'In service', Completed: 'Completed', Paid: 'Paid' },
  },
  remote: {
    label: 'Online / remote',
    description: 'Work done remotely and delivered online.',
    icon: 'cloud_done',
    needsAddress: false,
    tracking: false,
    requiresStaff: false,
    flow: ['Pending', 'Assigned', 'In Progress', 'Completed', 'Paid'],
    labels: { Pending: 'Requested', Assigned: 'Accepted', 'In Progress': 'In progress', Completed: 'Delivered', Paid: 'Paid' },
  },
};

const FULFILLMENT_TYPES = Object.keys(FULFILLMENT);
const fulfillmentOf = (type) => FULFILLMENT[type] || FULFILLMENT.onsite;

/** The status that follows `status` for this kind of job, or null at the end. */
function nextStatusFor(type, status) {
  const flow = fulfillmentOf(type).flow;
  const index = flow.indexOf(status);
  return index >= 0 && index < flow.length - 1 ? flow[index + 1] : null;
}

module.exports = { FULFILLMENT, FULFILLMENT_TYPES, fulfillmentOf, nextStatusFor };
