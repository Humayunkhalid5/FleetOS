// How a job reaches the customer. Mirrors server/src/config/fulfillment.js:
// each type walks a subset of the booking statuses with wording that fits.
export const FULFILLMENT = {
  onsite: {
    label: 'On-site visit',
    short: 'Home visit',
    icon: 'home_repair_service',
    needsAddress: true,
    tracking: true,
    requiresStaff: true,
    addressLabel: 'Service address',
    addressHint: 'Where the staff should come.',
    whenLabel: 'Arrival time',
    flow: ['Pending', 'Assigned', 'En Route', 'Arrived', 'In Progress', 'Completed', 'Paid'],
    labels: { Pending: 'Requested', Assigned: 'Staff assigned', 'En Route': 'On the way', Arrived: 'Arrived', 'In Progress': 'Work in progress', Completed: 'Completed', Paid: 'Paid' },
    actions: { Assigned: 'Assign staff', 'En Route': 'Start travel', Arrived: 'Mark arrived', 'In Progress': 'Start work', Completed: 'Complete job' },
  },
  delivery: {
    label: 'Delivery',
    short: 'Delivery',
    icon: 'local_shipping',
    needsAddress: true,
    tracking: true,
    requiresStaff: false,
    addressLabel: 'Delivery address',
    addressHint: 'Where the order should be delivered.',
    whenLabel: 'Delivery time',
    flow: ['Pending', 'Assigned', 'En Route', 'Arrived', 'Completed', 'Paid'],
    labels: { Pending: 'Order placed', Assigned: 'Accepted · preparing', 'En Route': 'Out for delivery', Arrived: 'Delivered', Completed: 'Order closed', Paid: 'Paid' },
    actions: { Assigned: 'Accept order', 'En Route': 'Send out for delivery', Arrived: 'Mark delivered', Completed: 'Close order' },
  },
  pickup: {
    label: 'Store pickup',
    short: 'Pickup',
    icon: 'shopping_bag',
    needsAddress: false,
    tracking: false,
    requiresStaff: false,
    addressLabel: 'Pickup from',
    whenLabel: 'Pickup time',
    flow: ['Pending', 'Assigned', 'In Progress', 'Completed', 'Paid'],
    labels: { Pending: 'Order placed', Assigned: 'Accepted', 'In Progress': 'Preparing', Completed: 'Ready / collected', Paid: 'Paid' },
    actions: { Assigned: 'Accept order', 'In Progress': 'Start preparing', Completed: 'Mark ready' },
  },
  instore: {
    label: 'Visit the business',
    short: 'In-store',
    icon: 'storefront',
    needsAddress: false,
    tracking: false,
    requiresStaff: false,
    addressLabel: 'Appointment at',
    whenLabel: 'Appointment time',
    flow: ['Pending', 'Assigned', 'Arrived', 'In Progress', 'Completed', 'Paid'],
    labels: { Pending: 'Requested', Assigned: 'Confirmed', Arrived: 'Checked in', 'In Progress': 'In service', Completed: 'Completed', Paid: 'Paid' },
    actions: { Assigned: 'Confirm', Arrived: 'Check in', 'In Progress': 'Start service', Completed: 'Complete' },
  },
  remote: {
    label: 'Online / remote',
    short: 'Online',
    icon: 'cloud_done',
    needsAddress: false,
    tracking: false,
    requiresStaff: false,
    addressLabel: 'Delivered',
    whenLabel: 'Start time',
    flow: ['Pending', 'Assigned', 'In Progress', 'Completed', 'Paid'],
    labels: { Pending: 'Requested', Assigned: 'Accepted', 'In Progress': 'In progress', Completed: 'Delivered', Paid: 'Paid' },
    actions: { Assigned: 'Accept', 'In Progress': 'Start work', Completed: 'Mark delivered' },
  },
};

export const FULFILLMENT_TYPES = Object.keys(FULFILLMENT);
export const fulfillmentOf = (type) => FULFILLMENT[type] || FULFILLMENT.onsite;
/** Fulfilment type of a booking (bookings made before fulfilment existed are on-site visits). */
export const bookingFulfillment = (booking) => booking?.fulfillment?.type || booking?.fulfillment || 'onsite';
export const nextStatusFor = (type, status) => {
  const flow = fulfillmentOf(type).flow;
  const index = flow.indexOf(status);
  return index >= 0 && index < flow.length - 1 ? flow[index + 1] : null;
};
/** Customer-facing words for a status in this kind of job. */
export const statusLabel = (status, type) => (status === 'Cancelled' ? 'Cancelled' : fulfillmentOf(type).labels[status] || status);
