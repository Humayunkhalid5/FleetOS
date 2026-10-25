#!/usr/bin/env node
/**
 * Generates client/public/og-image.png — the 1200x630 card used by
 * Open Graph and Twitter link previews.
 *
 *   node scripts/generate-og-image.mjs
 *
 * No image library is installed, so the PNG is written directly: the artwork
 * is the FleetOS mark on the dark brand gradient, rasterised with 2x
 * supersampling and encoded as an 8-bit RGB PNG (zlib via node:zlib).
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const WIDTH = 1200;
const HEIGHT = 630;
const SS = 2; // supersampling factor

/* ------------------------------------------------------------------ helpers */
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(rgb, width, height) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a + (b - a) * t;

/* --------------------------------------------------------------- background */
const rgb = Buffer.alloc(WIDTH * HEIGHT * 3);

function paintBackground() {
  const topLeft = [11, 22, 40];
  const bottomRight = [20, 41, 79];
  const glowBlue = [37, 99, 235];
  const glowCyan = [10, 199, 237];
  const glowViolet = [124, 58, 237];

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const t = (x / WIDTH) * 0.55 + (y / HEIGHT) * 0.45;
      let r = mix(topLeft[0], bottomRight[0], t);
      let g = mix(topLeft[1], bottomRight[1], t);
      let b = mix(topLeft[2], bottomRight[2], t);

      // Soft light sources, matching the in-app canvas tint.
      const add = (color, cx, cy, radius, strength) => {
        const dx = (x - cx) / radius;
        const dy = (y - cy) / radius;
        const falloff = Math.max(0, 1 - (dx * dx + dy * dy));
        const a = falloff * falloff * strength;
        r = mix(r, color[0], a);
        g = mix(g, color[1], a);
        b = mix(b, color[2], a);
      };
      add(glowBlue, 1040, 90, 640, 0.55);
      add(glowCyan, 170, 610, 560, 0.3);
      add(glowViolet, 760, 660, 520, 0.16);

      const i = (y * WIDTH + x) * 3;
      rgb[i] = Math.round(r);
      rgb[i + 1] = Math.round(g);
      rgb[i + 2] = Math.round(b);
    }
  }
}

/* --------------------------------------------------------------- logo mark */
// Same geometry as client/public/favicon.svg (viewBox 0 0 64 70).
const MARK = [
  { points: [[3, 13.2], [30.3, 1], [30.3, 15.8], [3, 28]], color: [37, 99, 235] },
  { points: [[3, 32.6], [30.3, 20.5], [30.3, 35.2], [3, 47.4]], color: [29, 78, 216] },
  { points: [[3, 52], [30.3, 39.9], [30.3, 54.6], [3, 66.8]], color: [10, 199, 237] },
  { points: [[36.8, 14.9], [62, 3.7], [62, 18.4], [36.8, 29.6]], color: [59, 111, 224] },
  { points: [[36.8, 34.4], [62, 23.2], [62, 37.9], [36.8, 49.1]], color: [43, 95, 217] },
];

function drawMark(scale, originX, originY) {
  const w = WIDTH * SS;
  const h = HEIGHT * SS;
  const mask = new Float32Array(w * h);

  for (const { points, color } of MARK) {
    mask.fill(0);
    const poly = points.map(([x, y]) => [originX * SS + x * scale * SS, originY * SS + y * scale * SS]);
    const minY = Math.max(0, Math.floor(Math.min(...poly.map((p) => p[1]))));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(...poly.map((p) => p[1]))));

    for (let y = minY; y <= maxY; y += 1) {
      const sampleY = y + 0.5;
      const crossings = [];
      for (let i = 0; i < poly.length; i += 1) {
        const [x1, y1] = poly[i];
        const [x2, y2] = poly[(i + 1) % poly.length];
        if ((y1 <= sampleY && y2 > sampleY) || (y2 <= sampleY && y1 > sampleY)) {
          crossings.push(x1 + ((sampleY - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      crossings.sort((a, b) => a - b);
      for (let c = 0; c < crossings.length; c += 2) {
        const from = Math.max(0, Math.ceil(crossings[c]));
        const to = Math.min(w - 1, Math.floor(crossings[c + 1]));
        for (let x = from; x <= to; x += 1) mask[y * w + x] = 1;
      }
    }

    // Downsample the 2x mask into coverage and composite the colour.
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        let cover = 0;
        for (let sy = 0; sy < SS; sy += 1) {
          for (let sx = 0; sx < SS; sx += 1) cover += mask[(y * SS + sy) * w + (x * SS + sx)];
        }
        cover /= SS * SS;
        if (!cover) continue;
        const i = (y * WIDTH + x) * 3;
        rgb[i] = Math.round(mix(rgb[i], color[0], cover));
        rgb[i + 1] = Math.round(mix(rgb[i + 1], color[1], cover));
        rgb[i + 2] = Math.round(mix(rgb[i + 2], color[2], cover));
      }
    }
  }
}

/* ------------------------------------------------------------------ accents */
function accentBar() {
  // Thin brand rail along the bottom edge, as on the live job card.
  const colors = [[37, 99, 235], [10, 199, 237], [124, 58, 237]];
  for (let x = 0; x < WIDTH; x += 1) {
    const t = x / (WIDTH - 1);
    const seg = t * (colors.length - 1);
    const i0 = Math.min(colors.length - 2, Math.floor(seg));
    const f = seg - i0;
    const c = colors[i0].map((value, index) => mix(value, colors[i0 + 1][index], f));
    for (let y = HEIGHT - 8; y < HEIGHT; y += 1) {
      const i = (y * WIDTH + x) * 3;
      rgb[i] = Math.round(c[0]);
      rgb[i + 1] = Math.round(c[1]);
      rgb[i + 2] = Math.round(c[2]);
    }
  }
}

function vignette() {
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const dx = (x - WIDTH / 2) / (WIDTH / 2);
      const dy = (y - HEIGHT / 2) / (HEIGHT / 2);
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const shade = 1 - d * d * 0.22;
      const i = (y * WIDTH + x) * 3;
      rgb[i] = Math.round(rgb[i] * shade);
      rgb[i + 1] = Math.round(rgb[i + 1] * shade);
      rgb[i + 2] = Math.round(rgb[i + 2] * shade);
    }
  }
}

paintBackground();
vignette();
// 64x70 mark scaled to ~330px tall, centred.
const scale = 330 / 70;
drawMark(scale, WIDTH / 2 - (64 * scale) / 2, HEIGHT / 2 - 330 / 2 - 12);
accentBar();

const target = fileURLToPath(new URL('../client/public/og-image.png', import.meta.url));
writeFileSync(target, encodePng(rgb, WIDTH, HEIGHT));
console.log(`Wrote ${target} (${WIDTH}x${HEIGHT})`);
