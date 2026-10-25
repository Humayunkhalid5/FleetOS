// Renders video/film.html to an MP4, frame by frame.
//   PLAYWRIGHT=<playwright-core path> node video/render.cjs                 → build/frames.mp4 (silent)
//   PLAYWRIGHT=... node video/render.cjs --stills 3,20,45                    → build/stills/*.jpg
//   options: --from 10 --to 20 (seconds), --fps 30
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const { chromium } = require(process.env.PLAYWRIGHT || 'playwright-core');
const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(__dirname, 'build');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = process.argv.slice(2);
const option = (name, fallback) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : fallback; };

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => console.error('page error:', error.message));
  page.on('console', (message) => { if (message.type() === 'error') console.error('console:', message.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/video/film.html?t=0`);
  await page.waitForFunction(() => window.FILM, null, { timeout: 60000 });
  await page.evaluate(() => window.FILM.ready);
  const { duration, fps: filmFps } = await page.evaluate(() => ({ duration: window.FILM.duration, fps: window.FILM.fps }));

  const stills = option('stills');
  if (stills) {
    const dir = path.join(BUILD, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const value of stills.split(',').map(Number)) {
      await page.evaluate((t) => window.FILM.seek(t), value);
      await page.screenshot({ path: path.join(dir, `t${String(value).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 88 });
      console.log('still', value);
    }
  } else {
    const fps = Number(option('fps', filmFps));
    const from = Number(option('from', 0));
    const to = Math.min(duration, Number(option('to', duration)));
    const output = path.join(BUILD, option('out', 'frames.mp4'));
    const ffmpeg = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), output], { stdio: ['pipe', 'ignore', 'inherit'] });
    const frames = Math.round((to - from) * fps);
    const started = Date.now();
    for (let frame = 0; frame < frames; frame += 1) {
      const t = from + frame / fps;
      await page.evaluate((time) => window.FILM.seek(time), t);
      const image = await page.screenshot({ type: 'jpeg', quality: 94 });
      if (!ffmpeg.stdin.write(image)) await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
      if (frame % 150 === 0) {
        const elapsed = (Date.now() - started) / 1000;
        console.log(`frame ${frame}/${frames}  t=${t.toFixed(1)}s  ${(frame / Math.max(elapsed, 0.001)).toFixed(1)} fps`);
      }
    }
    ffmpeg.stdin.end();
    await new Promise((resolve) => ffmpeg.on('close', resolve));
    console.log('wrote', output);
  }
  await browser.close();
  server.close();
})().catch((error) => { console.error(error); process.exit(1); });
