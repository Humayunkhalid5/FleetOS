const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Runs against a throwaway database on the local MongoDB; skipped when no
// MongoDB is reachable so the suite still passes on machines without one.
const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/fleetos_test_admin_password';
const email = 'admin-password-test@fleetos.local';
const original = 'Original-Pass-123!';
const next = 'Rotated-Pass-456!';

let server;
let base;
let available = true;

test.before(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
  } catch {
    available = false;
    return;
  }
  const User = require('../src/models/User');
  await User.deleteMany({ email });
  await User.create({ name: 'Test Admin', email, password: await bcrypt.hash(original, 12), role: 'super-admin' });
  const app = require('../src/app');
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/admin`;
});

test.after(async () => {
  if (server) server.close();
  if (available) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

const post = (path, body, headers = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('admin can change the password from the sign-in screen', async (t) => {
  if (!available) { t.skip('MongoDB not reachable'); return; }

  const login = await post('/auth/login', { email, password: original });
  assert.equal(login.status, 200);
  const { token: oldToken } = await login.json();

  const weak = await post('/auth/change-password', { email, currentPassword: original, newPassword: 'short' });
  assert.equal(weak.status, 400);

  const wrong = await post('/auth/change-password', { email, currentPassword: 'Not-The-Password-1!', newPassword: next });
  assert.equal(wrong.status, 401);

  const changed = await post('/auth/change-password', { email, currentPassword: original, newPassword: next });
  assert.equal(changed.status, 200);
  const body = await changed.json();
  assert.ok(body.token);
  assert.equal(body.user.email, email);

  // The hash in MongoDB is the new password, and older sessions are revoked.
  const User = require('../src/models/User');
  const stored = await User.findOne({ email }).select('+password').lean();
  assert.ok(await bcrypt.compare(next, stored.password));
  const stale = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${oldToken}` } });
  assert.equal(stale.status, 401);
  const fresh = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${body.token}` } });
  assert.equal(fresh.status, 200);

  assert.equal((await post('/auth/login', { email, password: original })).status, 401);
  assert.equal((await post('/auth/login', { email, password: next })).status, 200);
});

test('correct sign-ins never use up the sign-in limit; wrong ones are limited per email', async (t) => {
  if (!available) { t.skip('MongoDB not reachable'); return; }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    assert.equal((await post('/auth/login', { email, password: next })).status, 200);
  }
  let status = 0;
  for (let attempt = 0; attempt < 30 && status !== 429; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    status = (await post('/auth/login', { email: 'someone-else@fleetos.local', password: 'wrong-password' })).status;
  }
  assert.equal(status, 429);
  // Another account on the same IP is unaffected.
  assert.equal((await post('/auth/login', { email, password: next })).status, 200);
});

test('admin can set a new password for a customer account', async (t) => {
  if (!available) { t.skip('MongoDB not reachable'); return; }
  const User = require('../src/models/User');
  const customer = await User.create({ name: 'Locked Out', email: 'locked-out@fleetos.local', password: await bcrypt.hash('Forgotten-1!', 12), role: 'customer' });
  const { token } = await (await post('/auth/login', { email, password: next })).json();
  const response = await fetch(`${base}/users/${customer._id}/password`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ password: 'Brand-New-2!' }) });
  assert.equal(response.status, 200);
  const signIn = await fetch(base.replace('/admin', '/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'locked-out@fleetos.local', password: 'Brand-New-2!' }) });
  assert.equal(signIn.status, 200);
});

test('older slow hashes are upgraded on sign-in and keep working', async (t) => {
  if (!available) { t.skip('MongoDB not reachable'); return; }
  const User = require('../src/models/User');
  await User.create({ name: 'Old Hash', email: 'old-hash@fleetos.local', password: await bcrypt.hash('Old-Hash-1!', 12), role: 'customer' });
  const signIn = () => fetch(base.replace('/admin', '/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'old-hash@fleetos.local', password: 'Old-Hash-1!' }) });
  assert.equal((await signIn()).status, 200);
  let rounds = 12;
  for (let attempt = 0; attempt < 20 && rounds !== 10; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 100));
    // eslint-disable-next-line no-await-in-loop
    rounds = bcrypt.getRounds((await User.findOne({ email: 'old-hash@fleetos.local' }).select('+password').lean()).password);
  }
  assert.equal(rounds, 10);
  assert.equal((await signIn()).status, 200);
});

test('large JSON responses are compressed when the client accepts it', async (t) => {
  if (!available) { t.skip('MongoDB not reachable'); return; }
  const login = await post('/auth/login', { email, password: next });
  const { token } = await login.json();
  const response = await fetch(`${base}/overview`, { headers: { Authorization: `Bearer ${token}`, 'Accept-Encoding': 'gzip' } });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.metrics);
  if (JSON.stringify(payload).length >= 1024) assert.equal(response.headers.get('content-encoding'), 'gzip');
});
