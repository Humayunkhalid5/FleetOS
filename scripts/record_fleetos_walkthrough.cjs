const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'docs', 'FleetOS-Portal-Workflow-Walkthrough.mp4');
const transcriptPath = path.join(root, 'docs', 'FleetOS-Portal-Workflow-Walkthrough.md');
const workPath = path.join(os.tmpdir(), 'FleetOSVideoRecorder', `session-${Date.now()}`);
const clientUrl = 'http://localhost:5173';
const adminUrl = 'http://localhost:5174';
const width = 1600;
const height = 900;
const serviceName = 'Premium Installation Package';
const customerName = 'Ali Shahzad';

const chapters = [
  {
    id: 'customer',
    title: '01  CUSTOMER PORTAL',
    narration: 'Welcome to FleetOS. This walkthrough follows one service request across the customer, company, and Super Admin portals. The customer begins in the marketplace, where approved companies, service options, locations, and ratings are loaded from MongoDB. Search for a provider and review its active services before choosing a booking. Select an optional item from that company inventory, add a service address, and describe the work needed. The estimate updates to include the selected service and materials. Choose cash after service, review the scheduled request, and confirm. FleetOS validates the company and active service, stores the new booking in MongoDB, and routes the customer to live tracking. The same request is now ready for the company team.',
  },
  {
    id: 'company',
    title: '02  COMPANY WORKSPACE',
    narration: 'Next, the company operator signs into a tenant-scoped workspace. Operational records are limited to the authenticated company. In Requests, the new customer booking appears as Pending. Assign an available staff member and the request becomes Assigned. Move the work through En Route, Arrived, In Progress, and Completed. Each status change is validated by the API, saved to MongoDB, and broadcast to connected portals. For a cash booking, the company records payment after service is complete. FleetOS creates the payment record, marks the booking Paid, and generates an invoice. The company dashboard and job list update from the same source of truth.',
  },
  {
    id: 'customer-followup',
    title: '03  CUSTOMER FOLLOW-UP',
    narration: 'The customer can return to the portal to review the recorded receipt and completed job. Booking history, payment history, and live progress all reference the same database-backed record. After the work is paid, the customer can leave a rating and written review. That feedback is linked to the booking and company so it can appear in the company workspace and the Super Admin console.',
  },
  {
    id: 'admin',
    title: '04  SUPER ADMIN CONSOLE',
    narration: 'Finally, the separate Super Admin console provides platform-wide oversight. The overview summarizes companies, customers, jobs, recorded revenue, and ratings. The company registry shows approval and client visibility. The job registry exposes the booking reference, tenant, service, status, and amount. Finance lists recorded cash and invoice payments. Ratings and reviews show customer feedback, while System Health confirms MongoDB and API status. Admin actions are role-restricted, require confirmation, and are written to the audit history.',
  },
];

function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: 'inherit', ...options });
}

function quotePowerShell(value) {
  return String(value).replaceAll("'", "''");
}

function createNarration(text, filePath) {
  const encodedText = Buffer.from(text, 'utf8').toString('base64');
  const encodedPath = quotePowerShell(filePath);
  const powershell = [
    "$ErrorActionPreference = 'Stop'",
    '$voice = New-Object -ComObject SAPI.SpVoice',
    '$voices = $voice.GetVoices()',
    'for ($i = 0; $i -lt $voices.Count; $i++) { if ($voices.Item($i).GetDescription() -like "*Hazel*") { $voice.Voice = $voices.Item($i); break } }',
    '$voice.Rate = -1',
    '$voice.Volume = 100',
    `$text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedText}'))`,
    `$audioPath = '${encodedPath}'`,
    '$stream = New-Object -ComObject SAPI.SpFileStream',
    '$stream.Open($audioPath, 3, $false)',
    '$voice.AudioOutputStream = $stream',
    '$null = $voice.Speak($text, 0)',
    '$stream.Close()',
  ].join('; ');

  run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', powershell]);
}

function audioDuration(filePath) {
  const result = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1',
    filePath,
  ], { encoding: 'utf8' });
  return Number(result.trim());
}

function srtTime(seconds) {
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const secs = Math.floor((milliseconds % 60000) / 1000);
  const millis = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

async function setCaption(page, chapter, copy) {
  await page.evaluate(({ chapterText, copyText }) => {
    let style = document.getElementById('fleetos-walkthrough-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'fleetos-walkthrough-style';
      style.textContent = `
        #fleetos-walkthrough-caption {
          position: fixed; left: 50%; bottom: 26px; z-index: 2147483647;
          width: min(1120px, calc(100vw - 64px)); transform: translateX(-50%);
          display: flex; align-items: center; gap: 20px; padding: 18px 24px;
          border: 1px solid rgba(255,255,255,.2); border-radius: 18px;
          background: rgba(7, 20, 34, .92); color: #f8fafc;
          box-shadow: 0 18px 60px rgba(0,0,0,.26); backdrop-filter: blur(16px);
          font-family: 'Segoe UI', sans-serif; pointer-events: none;
        }
        #fleetos-walkthrough-caption .fleetos-caption-mark {
          width: 5px; align-self: stretch; min-height: 48px; border-radius: 8px;
          background: #7cc3a3; flex: 0 0 auto;
        }
        #fleetos-walkthrough-caption .fleetos-caption-copy { min-width: 0; }
        #fleetos-walkthrough-caption .fleetos-caption-title {
          margin-bottom: 5px; color: #a9d9c3; font-size: 12px; font-weight: 800;
          letter-spacing: .1em;
        }
        #fleetos-walkthrough-caption .fleetos-caption-text {
          color: #f8fafc; font-size: 18px; line-height: 1.35; font-weight: 600;
        }
        @media (max-width: 700px) {
          #fleetos-walkthrough-caption { width: calc(100vw - 28px); bottom: 14px; padding: 12px 14px; gap: 12px; }
          #fleetos-walkthrough-caption .fleetos-caption-text { font-size: 14px; }
        }
      `;
      document.head.appendChild(style);
    }
    let caption = document.getElementById('fleetos-walkthrough-caption');
    if (!caption) {
      caption = document.createElement('div');
      caption.id = 'fleetos-walkthrough-caption';
      caption.setAttribute('aria-hidden', 'true');
      caption.innerHTML = '<div class="fleetos-caption-mark"></div><div class="fleetos-caption-copy"><div class="fleetos-caption-title"></div><div class="fleetos-caption-text"></div></div>';
      document.body.appendChild(caption);
    }
    caption.querySelector('.fleetos-caption-title').textContent = chapterText;
    caption.querySelector('.fleetos-caption-text').textContent = copyText;
  }, { chapterText: chapter, copyText: copy });
}

async function waitForChapterEnd(page, startTime, duration) {
  const remaining = Math.ceil(duration * 1000 - (Date.now() - startTime));
  if (remaining > 0) await page.waitForTimeout(remaining);
}

async function signIn(page, role, email, password) {
  await page.goto(`${clientUrl}/login`, { waitUntil: 'domcontentloaded' });
  const label = role === 'company' ? 'COMPANY PORTAL' : 'CUSTOMER PORTAL';
  await setCaption(page, label, 'Sign in to your role-specific FleetOS workspace.');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Login/ }).click();
  const expectedPath = role === 'company' ? '/company/dashboard' : '/customer/companies';
  await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 20000 });
}

async function waitForStatus(page, targetStatus) {
  await page.waitForFunction(({ service, status, customer }) => {
    return [...document.querySelectorAll('tbody tr')].some((row) => (
      row.innerText.includes(service) && row.innerText.includes(customer) && row.innerText.includes(status)
    ));
  }, { service: serviceName, status: targetStatus, customer: customerName }, { timeout: 20000 });
}

async function main() {
  if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite existing video: ${outputPath}`);
  const playwrightPath = process.env.FLEETOS_PLAYWRIGHT;
  if (!playwrightPath) throw new Error('Set FLEETOS_PLAYWRIGHT to the temporary Playwright package path.');
  const { chromium } = require(playwrightPath);
  const adminPasswordPath = path.join(root, 'server', '.runtime', 'dev-admin-password');
  const adminPassword = fs.readFileSync(adminPasswordPath, 'utf8').trim();
  if (!adminPassword) throw new Error('The local development Super Admin password file is empty.');

  fs.mkdirSync(workPath, { recursive: true });
  const audioPaths = chapters.map((chapter) => path.join(workPath, `${chapter.id}.wav`));
  chapters.forEach((chapter, index) => createNarration(chapter.narration, audioPaths[index]));
  const chapterDurations = audioPaths.map(audioDuration);
  const timeline = chapters.map((chapter, index) => ({ ...chapter, duration: chapterDurations[index] }));
  const transcript = [
    '# FleetOS Portal Workflow Walkthrough',
    '',
    ...timeline.flatMap((chapter) => [`## ${chapter.title}`, '', chapter.narration, '']),
  ].join('\n');
  fs.writeFileSync(transcriptPath, transcript, 'utf8');

  const narrationConcat = path.join(workPath, 'narration-files.txt');
  fs.writeFileSync(narrationConcat, audioPaths.map((audioPath) => `file '${audioPath.replaceAll('\\', '/')}'`).join('\n'), 'utf8');
  const narrationPath = path.join(workPath, 'narration.wav');
  run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', narrationConcat, '-c:a', 'pcm_s16le', narrationPath]);

  const edgePath = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find((candidate) => fs.existsSync(candidate));
  if (!edgePath) throw new Error('Microsoft Edge was not found.');

  console.log(`Narration ready: ${chapterDurations.map((duration) => `${Math.round(duration)}s`).join(' / ')} seconds per chapter.`);
  console.log('Recording customer booking, company fulfilment, customer review, and Admin oversight.');
  const browser = await chromium.launch({
    headless: true,
    executablePath: edgePath,
    args: ['--no-first-run', '--disable-features=Translate'],
  });
  let page;
  let context;
  let bookingId;
  let bookingReference;
  let paymentReference;

  try {
    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      recordVideo: { dir: workPath, size: { width, height } },
    });
    page = await context.newPage();
    page.on('dialog', (dialog) => dialog.accept());

    const customerStart = Date.now();
    console.log('Chapter 1: Customer booking');
    await signIn(page, 'customer', 'customer@fleetos.local', 'FleetCustomer1!');
    await setCaption(page, '01  CUSTOMER PORTAL', 'Search MongoDB-backed companies and compare real services.');
    await page.locator('.client-company-card').first().waitFor({ timeout: 20000 });
    await page.getByPlaceholder(/Search by name, city, area or service/).fill('Lahore Home Solutions');
    const companyCard = page.locator('.client-company-card').filter({ hasText: 'Lahore Home Solutions' }).first();
    await companyCard.waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(1000);
    await setCaption(page, '01  CUSTOMER PORTAL', 'Choose a verified company to inspect its services and service areas.');
    await companyCard.getByRole('button', { name: 'Book Now' }).click();
    await page.waitForURL(/customer\/customize-booking/);
    await page.getByRole('heading', { name: 'Company Added Items' }).waitFor();
    await page.waitForTimeout(1000);
    await setCaption(page, '01  CUSTOMER PORTAL', 'Select an active service and optional stock supplied by the company.');
    await page.getByRole('button', { name: /Premium Installation Package/ }).click();
    const itemHeading = page.getByRole('heading', { name: 'Installation Starter Kit', exact: true });
    await itemHeading.waitFor({ timeout: 15000 });
    await itemHeading.locator('xpath=../..').getByRole('button', { name: 'add' }).click();
    await page.getByPlaceholder(/Enter or confirm your service address/).fill('Gulberg III, Lahore, Punjab');
    await page.locator('#problem-details').fill('Demo walkthrough request: home installation. Please call on arrival.');
    await page.waitForTimeout(1000);
    await setCaption(page, '01  CUSTOMER PORTAL', 'Add the address and request notes; the estimate recalculates automatically.');
    await page.getByRole('button', { name: 'Submit Request' }).click();
    await page.waitForURL(/customer\/booking-summary/);
    await page.getByText('Payment Summary').waitFor();
    await page.getByText('Cash after service', { exact: true }).click();
    await page.waitForTimeout(1200);
    await setCaption(page, '01  CUSTOMER PORTAL', 'Review service, materials, tax, schedule, and choose cash after service.');
    await page.getByRole('button', { name: /Confirm booking/ }).click();
    await page.waitForURL(/customer\/live-tracking/, { timeout: 20000 });
    bookingId = new URL(page.url()).searchParams.get('bookingId');
    if (!bookingId) throw new Error('The confirmed booking did not include a booking ID.');
    await page.waitForTimeout(1500);
    await setCaption(page, '01  CUSTOMER PORTAL', 'Confirmation creates the MongoDB booking and opens live tracking.');
    await waitForChapterEnd(page, customerStart, chapterDurations[0]);

    const companyStart = Date.now();
    console.log('Chapter 2: Company fulfilment and cash payment');
    await signIn(page, 'company', 'company@fleetos.local', 'FleetCompany1!');
    await setCaption(page, '02  COMPANY WORKSPACE', 'The tenant sees only its own jobs, staff, inventory, and customers.');
    await page.locator('.company-sidebar nav a').filter({ hasText: 'Requests' }).click();
    await page.getByRole('button', { name: 'Pending', exact: true }).click();
    let jobRow = page.locator('tbody tr').filter({ hasText: customerName }).filter({ hasText: serviceName }).first();
    await jobRow.waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(1000);
    await setCaption(page, '02  COMPANY WORKSPACE', 'A new request arrives in Pending and can be assigned to available staff.');
    await jobRow.locator('select').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'All', exact: true }).click();
    jobRow = page.locator('tbody tr').filter({ hasText: customerName }).filter({ hasText: serviceName }).first();
    await waitForStatus(page, 'Assigned');
    await page.waitForTimeout(700);
    for (const status of ['En Route', 'Arrived', 'In Progress', 'Completed']) {
      await setCaption(page, '02  COMPANY WORKSPACE', `Advance the validated job lifecycle to ${status}.`);
      await jobRow.getByRole('button', { name: `Mark ${status}` }).click();
      await waitForStatus(page, status);
      await page.waitForTimeout(650);
    }

    const paymentResult = await page.evaluate(async (id) => {
      const token = localStorage.getItem('fleetos-company-token') || '';
      const response = await fetch(`/api/bookings/${id}/payment`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || `Cash payment failed (${response.status})`);
      return { payment: result.payment, booking: result.booking };
    }, bookingId);
    bookingReference = paymentResult.booking.reference;
    paymentReference = paymentResult.payment.reference;
    await waitForStatus(page, 'Paid');
    await page.waitForTimeout(1200);
    await setCaption(page, '02  COMPANY WORKSPACE', 'Record cash after completion; the receipt is written and status becomes Paid.');
    await waitForChapterEnd(page, companyStart, chapterDurations[1]);

    const followupStart = Date.now();
    console.log('Chapter 3: Customer payment history and review');
    await signIn(page, 'customer', 'customer@fleetos.local', 'FleetCustomer1!');
    await setCaption(page, '03  CUSTOMER FOLLOW-UP', 'The customer returns to check the completed request and recorded payment.');
    await page.waitForTimeout(1800);
    await page.getByRole('button', { name: 'Open client profile menu' }).click();
    await page.getByRole('link', { name: /Payments/ }).click();
    await page.getByText('Payment history', { exact: true }).waitFor();
    if (paymentReference) await page.getByText(paymentReference, { exact: true }).waitFor({ timeout: 15000 });
    await setCaption(page, '03  CUSTOMER FOLLOW-UP', 'Customers can verify the cash receipt and completed booking in payment history.');
    await page.waitForTimeout(4500);
    await page.getByRole('button', { name: 'Open client profile menu' }).click();
    await page.getByRole('link', { name: /My Bookings/ }).click();
    if (bookingReference) await page.getByText(new RegExp(bookingReference)).waitFor({ timeout: 15000 });
    await setCaption(page, '03  CUSTOMER FOLLOW-UP', 'The booking timeline and payment status stay connected to the same request.');
    await page.waitForTimeout(3500);
    const bookingCard = page.locator('.client-dashboard-shell main div.bg-surface-container-lowest').filter({ hasText: serviceName }).first();
    await bookingCard.getByRole('button', { name: 'Leave Review' }).click();
    await page.getByRole('heading', { name: 'Service Completed!' }).waitFor();
    await page.locator('button.group.p-1').nth(4).click();
    await page.locator('#experience').fill('The team arrived on time, kept me updated, and completed the installation as agreed.');
    await setCaption(page, '03  CUSTOMER FOLLOW-UP', 'Submit a service rating and written feedback linked to this paid job.');
    await page.waitForTimeout(7500);
    await page.getByRole('button', { name: /Submit Review/ }).click();
    await page.waitForURL(/customer\/companies/);
    await page.locator('.client-company-card').first().waitFor({ timeout: 20000 });
    await setCaption(page, '03  CUSTOMER FOLLOW-UP', 'The saved review is now available to the company and Super Admin.');
    await page.waitForTimeout(2500);
    await waitForChapterEnd(page, followupStart, chapterDurations[2]);

    const adminStart = Date.now();
    console.log('Chapter 4: Super Admin oversight');
    await page.goto(adminUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('.admin-login').waitFor({ timeout: 15000 });
    await setCaption(page, '04  SUPER ADMIN CONSOLE', 'A separate, restricted console provides platform-wide oversight.');
    await page.locator('input[type="email"]').fill('admin@fleetos.local');
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.waitForTimeout(450);
    await page.getByRole('button', { name: 'Enter secure console' }).click();
    await page.locator('.admin-shell').waitFor({ timeout: 20000 });
    await page.getByText('Recorded payments', { exact: true }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
    await setCaption(page, '04  SUPER ADMIN CONSOLE', 'Review platform totals, pending approvals, and recent jobs.');

    await page.locator('.sidebar nav button').filter({ hasText: 'Jobs' }).click();
    await page.getByRole('heading', { name: 'Platform jobs' }).waitFor();
    if (bookingReference) await page.getByText(bookingReference, { exact: true }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(900);
    await setCaption(page, '04  SUPER ADMIN CONSOLE', 'The job registry shows the booking reference, company, status, and amount.');

    await page.locator('.sidebar nav button').filter({ hasText: 'Ratings & reviews' }).click();
    await page.getByRole('heading', { name: 'Ratings and reviews' }).waitFor();
    await page.waitForTimeout(900);
    await setCaption(page, '04  SUPER ADMIN CONSOLE', 'Customer feedback is available alongside the booking it belongs to.');

    await page.locator('.sidebar nav button').filter({ hasText: 'Finance' }).click();
    await page.getByRole('heading', { name: 'Recorded finance ledger' }).waitFor();
    if (paymentReference) await page.getByText(paymentReference, { exact: true }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(900);
    await setCaption(page, '04  SUPER ADMIN CONSOLE', 'Recorded cash and invoice payments feed the finance ledger.');

    await page.locator('.sidebar nav button').filter({ hasText: 'System health' }).click();
    await page.getByRole('heading', { name: 'MongoDB', exact: true }).waitFor();
    await page.getByText('connected', { exact: true }).waitFor({ timeout: 15000 });
    await setCaption(page, '04  SUPER ADMIN CONSOLE', 'MongoDB and API health complete the end-to-end workflow.');
    await waitForChapterEnd(page, adminStart, chapterDurations[3]);

    console.log(`Recorded booking ${bookingReference || '(reference pending)'} and payment ${paymentReference || '(payment pending)'}.`);
    await page.close();
    await context.close();
    const video = path.join(workPath, 'workflow.webm');
    const videoList = fs.readdirSync(workPath).filter((file) => file.endsWith('.webm'));
    if (!videoList.length) throw new Error('Edge did not produce a browser video file.');
    const recordedVideo = path.join(workPath, videoList[0]);
    const totalAudioDuration = audioDuration(narrationPath);
    console.log(`Encoding ${Math.round(totalAudioDuration)} seconds of narrated walkthrough...`);
    run('ffmpeg', [
      '-y', '-i', recordedVideo, '-i', narrationPath,
      '-map', '0:v:0', '-map', '1:a:0',
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', '30', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart',
      outputPath,
    ]);

    const subtitles = [];
    let cursor = 0;
    timeline.forEach((chapter, index) => {
      const start = cursor;
      cursor += chapter.duration;
      subtitles.push(`${index + 1}\n${srtTime(start)} --> ${srtTime(cursor)}\n${chapter.title.replace(/^\d+\s+/, '')}\n${chapter.narration}\n`);
    });
    fs.writeFileSync(outputPath.replace(/\.mp4$/i, '.srt'), subtitles.join('\n'), 'utf8');
    const details = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', outputPath], { encoding: 'utf8' });
    const media = JSON.parse(details).format;
    console.log(`Video ready: ${outputPath}`);
    console.log(`Duration: ${Number(media.duration).toFixed(1)}s; size: ${(Number(media.size) / 1024 / 1024).toFixed(1)} MB.`);
    console.log(`Transcript: ${transcriptPath}`);
    console.log(`Subtitles: ${outputPath.replace(/\.mp4$/i, '.srt')}`);
  } finally {
    if (context) await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`Walkthrough recording failed: ${error.message}`);
  process.exitCode = 1;
});