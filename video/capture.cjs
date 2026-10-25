// Captures real FleetOS screens for the showcase video.
//   PLAYWRIGHT=<path to playwright-core> ADMIN_EMAIL=... ADMIN_PASSWORD=... node video/capture.cjs
// Requires the dev stack (npm run dev) to be running.
const fs = require('fs');
const path = require('path');

const { chromium } = require(process.env.PLAYWRIGHT || 'playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'build', 'shots');
const CLIENT = 'http://localhost:5173';
const ADMIN = 'http://localhost:5174';
const API = 'http://localhost:5000'; // Node calls go straight to the API, not through the Vite proxy.
fs.mkdirSync(OUT, { recursive: true });

async function login(base, endpoint, email, password) {
  const response = await fetch(`${base}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`${email}: sign-in failed (${response.status})`);
  return response.json();
}

async function shoot(context, url, file, { wait = 2600, before } = {}) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
  if (before) await before(page);
  await page.waitForTimeout(wait);
  // Finish scroll-reveal and entrance animations so nothing is captured mid-fade.
  await page.addStyleTag({ content: '*,*::before,*::after{animation-delay:0s!important;animation-duration:0s!important;transition:none!important}.reveal{opacity:1!important}' });
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((node) => node.classList.add('is-visible')));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 92 });
  console.log('captured', file);
  await page.close();
}

async function portal(browser, origin, storage) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  await context.addInitScript((items) => { Object.entries(items).forEach(([key, value]) => localStorage.setItem(key, value)); }, storage);
  return context;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=d3d11', '--enable-gpu-rasterization'] });
  const customer = await login(API, '/api/auth/login', 'customer@fleetos.local', 'FleetCustomer1!');
  const company = await login(API, '/api/auth/login', 'company@fleetos.local', 'FleetCompany1!');
  const bookings = await (await fetch(`${API}/api/bookings`, { headers: { Authorization: `Bearer ${customer.token}` } })).json();
  const active = (bookings.bookings || bookings).find((booking) => ['En Route', 'In Progress', 'Assigned', 'Arrived'].includes(booking.status)) || (bookings.bookings || bookings)[0];

  // Public + customer: light theme.
  const publicLight = await portal(browser, CLIENT, { 'fleetos-theme': 'light' });
  await shoot(publicLight, `${CLIENT}/`, 'landing.jpg', { wait: 5200 });
  const customerLight = await portal(browser, CLIENT, { 'fleetos-theme': 'light', 'fleetos-customer-token': customer.token });
  await shoot(customerLight, `${CLIENT}/customer/companies`, 'customer-companies.jpg', { wait: 4200 });
  await shoot(customerLight, `${CLIENT}/customer/company/pak-fleet-mobility`, 'customer-company.jpg', { wait: 3600 });
  if (active) await shoot(customerLight, `${CLIENT}/customer/live-tracking?bookingId=${active._id}`, 'customer-tracking.jpg', { wait: 5200 });
  await shoot(customerLight, `${CLIENT}/customer/bookings`, 'customer-bookings.jpg');

  // Company workspace: dark theme.
  const companyDark = await portal(browser, CLIENT, { 'fleetos-theme': 'dark', 'fleetos-company-token': company.token });
  await shoot(companyDark, `${CLIENT}/company/dashboard`, 'company-dashboard.jpg', { wait: 4200 });
  await shoot(companyDark, `${CLIENT}/company/dispatch`, 'company-dispatch.jpg', { wait: 4200 });
  await shoot(companyDark, `${CLIENT}/company/bookings`, 'company-bookings.jpg', { wait: 3600 });

  // Super Admin console: light theme.
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const admin = await login(API, '/api/admin/auth/login', process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    const adminLight = await portal(browser, ADMIN, { 'fleetos-admin-theme': 'light', 'fleetos-admin-token': admin.token });
    await shoot(adminLight, `${ADMIN}/#overview`, 'admin-overview.jpg', { wait: 4200 });
    await shoot(adminLight, `${ADMIN}/#companies`, 'admin-companies.jpg', { wait: 3600 });
  }
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
