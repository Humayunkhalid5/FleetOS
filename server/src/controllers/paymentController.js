const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

const stripeApiVersion = '2026-02-25.clover';

function clientOrigin() {
  return String(process.env.CLIENT_ORIGIN || process.env.CORS_ORIGINS || 'http://localhost:5173').split(',')[0].trim();
}

function verifyStripeSignature(payload, header, secret) {
  const parts = String(header || '').split(',').map((part) => part.split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return signatures.some((signature) => {
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  });
}

exports.getPayments = async (req, res) => {
  const filter = req.user.role === 'customer' ? { customer: req.user._id } : { company: req.company._id };
  const payments = await Payment.find(filter).populate('booking', 'reference status serviceSnapshot scheduledAt').populate('company', 'name logo').sort({ createdAt: -1 }).lean();
  return res.json({ payments });
};

exports.recordPayment = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, company: req.company._id, status: 'Completed' });
  if (!booking || !booking.customer) return res.status(404).json({ message: 'Completed customer booking not found' });
  const key = req.headers['idempotency-key'] || req.body.idempotencyKey || null;
  let payment = await Payment.findOne({ booking: booking._id });
  if (!payment) {
    payment = await Payment.create({
      reference: `PAY-${crypto.randomInt(100000, 999999)}`,
      booking: booking._id,
      customer: booking.customer,
      company: booking.company,
      amount: booking.pricing.finalTotal,
      method: booking.paymentMethod,
      status: 'recorded',
      recordedAt: new Date(),
      ...(key ? { idempotencyKey: key } : {}),
    });
  } else if (payment.status !== 'recorded') {
    payment.status = 'recorded';
    payment.recordedAt = new Date();
    await payment.save();
  }
  booking.status = 'Paid';
  booking.paymentStatus = 'paid';
  booking.statusHistory.push({ status: 'Paid', at: new Date(), byRole: 'company', note: 'Payment recorded' });
  await booking.save();
  return res.json({ payment, booking });
};

exports.createCardCheckout = async (req, res) => {
  const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) return res.status(503).json({ message: 'Card checkout is not configured. Choose cash or add STRIPE_SECRET_KEY.' });
  const booking = await Booking.findOne({ _id: req.params.bookingId, customer: req.user._id, paymentMethod: 'card', status: { $ne: 'Cancelled' } });
  if (!booking) return res.status(404).json({ message: 'Card booking not found' });
  if (booking.paymentStatus === 'paid') return res.status(409).json({ message: 'This booking is already paid' });

  const payment = await Payment.findOneAndUpdate(
    { booking: booking._id },
    {
      $set: { amount: booking.pricing.finalTotal, method: 'card', status: 'pending', provider: 'stripe' },
      $setOnInsert: { reference: `PAY-${crypto.randomInt(100000, 999999)}`, customer: booking.customer, company: booking.company },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const currency = String(process.env.STRIPE_CURRENCY || 'pkr').toLowerCase();
  const body = new URLSearchParams({
    mode: 'payment',
    success_url: `${clientOrigin()}/customer/bookings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientOrigin()}/customer/bookings?payment=cancelled`,
    customer_email: booking.customerEmail || req.user.email,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': currency,
    'line_items[0][price_data][unit_amount]': String(Math.round(booking.pricing.finalTotal * 100)),
    'line_items[0][price_data][product_data][name]': `${booking.serviceSnapshot.name} · ${booking.reference}`,
    'metadata[bookingId]': String(booking._id),
    'metadata[paymentId]': String(payment._id),
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': stripeApiVersion },
    body,
  });
  const session = await response.json();
  if (!response.ok || !session.url) return res.status(502).json({ message: session?.error?.message || 'Unable to start card checkout' });
  payment.providerSessionId = session.id;
  await payment.save();
  return res.status(201).json({ checkoutUrl: session.url, payment });
};

exports.stripeWebhook = async (req, res) => {
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!secret) return res.status(503).json({ message: 'Stripe webhook is not configured' });
  const payload = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
  if (!verifyStripeSignature(payload, req.headers['stripe-signature'], secret)) return res.status(400).json({ message: 'Invalid Stripe signature' });
  const event = JSON.parse(payload);
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    const session = event.data.object;
    const booking = await Booking.findById(session.metadata?.bookingId);
    if (booking && session.payment_status === 'paid') {
      await Payment.findOneAndUpdate(
        { booking: booking._id },
        {
          $set: { status: 'recorded', recordedAt: new Date(), provider: 'stripe', providerSessionId: session.id, providerPaymentIntentId: session.payment_intent || '' },
          $setOnInsert: { reference: `PAY-${crypto.randomInt(100000, 999999)}`, customer: booking.customer, company: booking.company, amount: booking.pricing.finalTotal, method: 'card' },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      booking.paymentStatus = 'paid';
      await booking.save();
    }
  }
  if (event.type === 'checkout.session.async_payment_failed') {
    const booking = await Booking.findById(event.data.object.metadata?.bookingId);
    if (booking) {
      booking.paymentStatus = 'failed';
      await booking.save();
      await Payment.updateOne({ booking: booking._id }, { status: 'failed' });
    }
  }
  return res.json({ received: true });
};
