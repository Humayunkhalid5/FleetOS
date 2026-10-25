import { useState } from 'react';
import api from '../../services/api';
import { useFeedback } from '../../hooks/useFeedback';
import { bookingFulfillment, fulfillmentOf, nextStatusFor } from '../../constants/fulfillment';

/**
 * The next step a business can take on a booking, worded for its kind of job
 * ("Accept order", "Send out for delivery", "Check in"...), or null when the
 * next step is assigning staff, recording payment, or there is none.
 */
export function nextAction(booking, { staffManaged = true } = {}) {
  if (!booking || ['Completed', 'Paid', 'Cancelled'].includes(booking.status)) return null;
  const type = bookingFulfillment(booking);
  const status = nextStatusFor(type, booking.status);
  if (!status || status === 'Paid') return null;
  // On-site visits start by choosing who goes, through the staff picker.
  if (status === 'Assigned' && fulfillmentOf(type).requiresStaff && staffManaged) return null;
  return { status, label: fulfillmentOf(type).actions[status] || status };
}

/** Company-side lifecycle actions with confirmation, toasts and busy state. */
export default function useBookingActions() {
  const { confirm, prompt, toast } = useFeedback();
  const [busy, setBusy] = useState('');

  const run = async (id, action, success) => {
    setBusy(id);
    try { await action(); if (success) toast.success(success); return true; }
    catch (error) { toast.error(error.message); return false; }
    finally { setBusy(''); }
  };

  return {
    busy,
    assign: (booking, technician) => run(booking._id, () => api.post(`/bookings/${booking._id}/assign`, { technicianId: technician._id || technician }), `${technician.name || 'Staff'} assigned to ${booking.reference}`),
    advance: (booking, options) => {
      const next = nextAction(booking, options);
      return next && run(booking._id, () => api.put(`/bookings/${booking._id}`, { status: next.status }), `${booking.reference}: ${fulfillmentOf(bookingFulfillment(booking)).labels[next.status] || next.status}`);
    },
    recordPayment: async (booking) => {
      const ok = await confirm({ title: 'Record payment?', message: `Confirm you received ${booking.paymentMethod || 'cash'} payment of PKR ${Number(booking.pricing?.finalTotal || 0).toLocaleString('en-PK')} from ${booking.customerName}. The customer gets the invoice immediately.`, confirmLabel: 'Record payment' });
      return ok && run(booking._id, () => api.post(`/bookings/${booking._id}/payment`, { idempotencyKey: `pay-${booking._id}` }), `Payment recorded for ${booking.reference}`);
    },
    cancel: async (booking) => {
      const isOrder = ['delivery', 'pickup'].includes(bookingFulfillment(booking));
      const reason = await prompt({ title: `${isOrder ? 'Decline or cancel' : 'Cancel'} ${booking.reference}?`, message: 'The customer sees this reason on their booking.', label: 'Reason', placeholder: isOrder ? 'e.g. This item is out of stock today' : 'e.g. No staff available in this area today', confirmLabel: isOrder ? 'Cancel order' : 'Cancel booking', tone: 'danger', multiline: true });
      return reason && run(booking._id, () => api.put(`/bookings/${booking._id}`, { status: 'Cancelled', reason }), `${booking.reference} cancelled`);
    },
  };
}
