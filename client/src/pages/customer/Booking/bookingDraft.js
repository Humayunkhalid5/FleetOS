// The in-progress booking survives a reload or a trip to chat and back.
const KEY = 'fleetos-booking-draft';
export const TAX_RATE = 0.085;

export function readDraft() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
}

export function writeDraft(draft) {
  try { sessionStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* storage unavailable */ }
}

export function clearDraft() {
  try { sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

/** Same arithmetic as the server: quantity × price, add-ons, tax, then the delivery fee. */
export function totals(servicePrice, materials = [], { quantity = 1, fee = 0 } = {}) {
  const service = Math.round((Number(servicePrice) || 0) * Math.max(1, Number(quantity) || 1));
  const items = Math.round(materials.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0));
  const subtotal = service + items;
  const tax = Math.round(subtotal * TAX_RATE);
  const delivery = Math.round(Number(fee) || 0);
  return { service, items, subtotal, tax, fee: delivery, total: subtotal + tax + delivery };
}

export const TIME_SLOTS = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];

export function slotLabel(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return date.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });
}

export function localDateInput(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}
