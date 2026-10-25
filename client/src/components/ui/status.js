// Booking lifecycle and status tones, shared by components and pages.
export const LIFECYCLE = ['Pending', 'Assigned', 'En Route', 'Arrived', 'In Progress', 'Completed', 'Paid'];

export const STATUS_META = {
  pending: ['warning', 'schedule'],
  open: ['warning', 'radio_button_unchecked'],
  assigned: ['info', 'assignment_ind'],
  'en route': ['info', 'local_shipping'],
  arrived: ['info', 'where_to_vote'],
  'in progress': ['brand', 'construction'],
  completed: ['success', 'task_alt'],
  paid: ['success', 'paid'],
  recorded: ['success', 'receipt_long'],
  resolved: ['success', 'check_circle'],
  approved: ['success', 'verified'],
  active: ['success', 'check_circle'],
  available: ['success', 'check_circle'],
  'in stock': ['success', 'inventory'],
  cancelled: ['danger', 'cancel'],
  canceled: ['danger', 'cancel'],
  rejected: ['danger', 'block'],
  suspended: ['danger', 'pause_circle'],
  failed: ['danger', 'error'],
  'low stock': ['warning', 'warning'],
  'out of stock': ['danger', 'remove_shopping_cart'],
  'on job': ['info', 'engineering'],
  busy: ['info', 'engineering'],
  'off duty': ['neutral', 'bedtime'],
  inactive: ['neutral', 'do_not_disturb_on'],
  draft: ['neutral', 'edit_note'],
  unpaid: ['warning', 'hourglass_empty'],
};

export function statusTone(status) {
  return (STATUS_META[String(status || '').toLowerCase()] || ['neutral'])[0];
}
