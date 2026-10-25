const test = require('node:test');
const assert = require('node:assert/strict');
const controller = require('../src/controllers/authController');
const { monthlyTotals } = require('../src/utils/months');

const { oauthConfig, configuredProviders, hasVerifiedEmail, oauthLanding } = controller.oauthHelpers;
const req = { protocol: 'http', get: () => 'localhost:5000', params: {} };

function withEnv(values, run) {
  const saved = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  const apply = (entries) => Object.entries(entries).forEach(([key, value]) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; });
  apply(values);
  let result;
  try { result = run(); } catch (error) { apply(saved); throw error; }
  // Restore only after an async test body has finished.
  if (result?.then) return result.finally(() => apply(saved));
  apply(saved);
  return result;
}

test('only providers with both client ID and secret are offered', () => {
  withEnv({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret', LINKEDIN_CLIENT_ID: 'id', LINKEDIN_CLIENT_SECRET: undefined }, () => {
    assert.deepEqual(configuredProviders(), ['google']);
  });
});

test('callback URLs follow OAUTH_CALLBACK_BASE_URL when set', () => {
  withEnv({ OAUTH_CALLBACK_BASE_URL: 'https://app.example.com/' }, () => {
    assert.equal(oauthConfig('google', req).redirectUri, 'https://app.example.com/api/auth/oauth/google/callback');
    assert.equal(oauthConfig('linkedin', req).redirectUri, 'https://app.example.com/api/auth/oauth/linkedin/callback');
  });
  withEnv({ OAUTH_CALLBACK_BASE_URL: undefined }, () => {
    assert.equal(oauthConfig('google', req).redirectUri, 'http://localhost:5000/api/auth/oauth/google/callback');
  });
  assert.equal(oauthConfig('github', req), null);
});

test('accounts are only linked by a provider-verified email', () => {
  assert.equal(hasVerifiedEmail({ email: 'a@b.pk', email_verified: true }), true);
  assert.equal(hasVerifiedEmail({ email: 'a@b.pk', email_verified: 'true' }), true);
  assert.equal(hasVerifiedEmail({ email: 'a@b.pk', email_verified: false }), false);
  assert.equal(hasVerifiedEmail({ email: 'a@b.pk' }), false);
  assert.equal(hasVerifiedEmail({ email_verified: true }), false);
});

test('social sign-in opens the workspace that matches the account role', () => {
  withEnv({ CLIENT_ORIGIN: 'http://localhost:5173' }, () => {
    assert.equal(oauthLanding({ role: 'company' }, 'google'), 'http://localhost:5173/company/dashboard?oauth=google');
    assert.equal(oauthLanding({ role: 'customer' }, 'linkedin'), 'http://localhost:5173/customer/companies?oauth=linkedin');
  });
});

test('starting OAuth redirects to the provider with state and a nonce cookie', async () => {
  await withEnv({ GOOGLE_CLIENT_ID: 'client-123', GOOGLE_CLIENT_SECRET: 'secret', OAUTH_CALLBACK_BASE_URL: undefined }, async () => {
    const headers = {};
    let location = '';
    const res = { setHeader: (name, value) => { headers[name] = value; }, redirect: (url) => { location = url; }, status: () => res, json: () => res };
    await controller.startOAuth({ ...req, params: { provider: 'google' } }, res);
    const url = new URL(location);
    assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(url.searchParams.get('client_id'), 'client-123');
    assert.equal(url.searchParams.get('scope'), 'openid email profile');
    assert.ok(url.searchParams.get('state'));
    assert.match(headers['Set-Cookie'], /^fleetos_oauth_state=[\w-]+; HttpOnly; Path=\/api\/auth\/oauth; SameSite=Lax/);
  });
});

test('an unconfigured provider answers 503 instead of redirecting', async () => {
  await withEnv({ LINKEDIN_CLIENT_ID: undefined, LINKEDIN_CLIENT_SECRET: undefined }, async () => {
    let status = 0;
    const res = { status: (code) => { status = code; return res; }, json: () => res, redirect: () => assert.fail('should not redirect') };
    await controller.startOAuth({ ...req, params: { provider: 'linkedin' } }, res);
    assert.equal(status, 503);
  });
});

test('revenue months always cover the last six calendar months', () => {
  const now = new Date(2026, 9, 18);
  const rows = monthlyTotals([{ at: new Date(2026, 7, 5), amount: 100 }, { at: new Date(2026, 7, 20), amount: 50 }, { at: new Date(2025, 0, 1), amount: 999 }], { now, dateOf: (row) => row.at, amountOf: (row) => row.amount });
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map((row) => row.month), [5, 6, 7, 8, 9, 10]);
  assert.deepEqual(rows.map((row) => row.amount), [0, 0, 0, 150, 0, 0]);
});
