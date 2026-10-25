import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// FleetOS showcase film. Everything is a pure function of time `t`, so the
// renderer can seek frame by frame (window.seek) and every frame is exact.

const TL = await (await fetch('build/timeline.json')).json();
await Promise.all([document.fonts.load('800 40px Inter'), document.fonts.load('96px "Material Symbols Outlined"', 'person')]);
const SCENES = TL.scenes;
const BY_ID = Object.fromEntries(SCENES.map((scene, index) => [scene.id, { ...scene, index }]));
const DURATION = TL.duration;

/* ------------------------------------------------------------------ math */
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (x) => 1 - (1 - clamp(x)) ** 3;
const easeInOut = (x) => { const v = clamp(x); return v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2; };
const easeBack = (x) => { const v = clamp(x); const c = 1.7; return 1 + (c + 1) * (v - 1) ** 3 + c * (v - 1) ** 2; };
const prog = (t, start, length) => clamp((t - start) / length);
function seeded(seed) { let value = seed; return () => { value = (value * 16807) % 2147483647; return (value - 1) / 2147483646; }; }

/* ------------------------------------------------------------ time cues */
function cue(text) {
  const match = String(text).trim().match(/^(\w+)([@:%])([\d.]+)([+-][\d.]+)?$/);
  if (!match) throw new Error(`Bad cue ${text}`);
  const [, id, kind, value, offset] = match;
  const scene = BY_ID[id];
  let time;
  if (kind === '@') time = scene.start + Number(value);
  else if (kind === '%') time = scene.voiceStart + Number(value) * scene.voiceLength;
  else time = scene.sentences[Math.min(Number(value), scene.sentences.length - 1)].start;
  return time + Number(offset || 0);
}
const sentence = (id, index) => BY_ID[id].sentences[Math.min(index, BY_ID[id].sentences.length - 1)].start;

/* ------------------------------------------------------------ DOM motion */
const sceneEls = [...document.querySelectorAll('.scene')].map((el) => ({ el, scene: BY_ID[el.dataset.scene] }));
const animated = [...document.querySelectorAll('[data-fx]')].map((el) => ({
  el,
  fx: el.dataset.fx,
  at: cue(el.dataset.at),
  until: el.dataset.until ? cue(el.dataset.until) : null,
  dur: Number(el.dataset.dur || (el.dataset.fx === 'lane' ? 0.55 : 0.8)),
  base: el.dataset.base || '',
}));

function applyFx(item, t) {
  const raw = prog(t, item.at, item.dur);
  let p = easeOut(raw);
  let transform = '';
  let opacity = p;
  let filter = '';
  switch (item.fx) {
    case 'up': transform = `translateY(${(1 - p) * 60}px)`; break;
    case 'down': transform = `translateY(${-(1 - p) * 60}px)`; break;
    case 'left': transform = `translateX(${-(1 - p) * 90}px)`; break;
    case 'right': transform = `translateX(${(1 - p) * 90}px)`; break;
    case 'pop': p = easeBack(raw); transform = `scale(${0.35 + 0.65 * p})`; opacity = clamp(raw * 2.5); break;
    case 'blur': transform = `scale(${1.08 - 0.08 * p})`; filter = `blur(${(1 - p) * 18}px)`; break;
    case 'lane': transform = `translateX(${-(1 - p) * 26}px) scaleX(${0.3 + 0.7 * p})`; break;
    case 'panel': transform = `translateY(${(1 - p) * 80}px) rotateX(${(1 - p) * 18}deg) scale(${0.9 + 0.1 * p})`; break;
    default: break;
  }
  if (item.until !== null) {
    const q = easeOut(prog(t, item.until, 0.45));
    opacity *= 1 - q;
    transform += ` translateY(${-q * 30}px) scale(${1 - q * 0.04})`;
  }
  item.el.style.opacity = opacity.toFixed(3);
  item.el.style.transform = `${item.base} ${transform}`.trim();
  if (item.fx === 'blur') item.el.style.filter = filter;
}

function sceneOpacity(scene, t) {
  const fadeIn = scene.index === 0 ? 1 : easeOut(prog(t, scene.start, 0.5));
  const fadeOut = scene.index === SCENES.length - 1 ? 1 : 1 - easeInOut(prog(t, scene.end - 0.45, 0.45));
  return t < scene.start || t > scene.end ? 0 : fadeIn * fadeOut;
}

/* ------------------------------------------------------------- captions */
// Balanced caption lines: roughly equal length, breaking at commas when one is near.
function splitCaption(text) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const count = words.length <= 10 ? 1 : Math.ceil(words.length / 8);
  const cuts = [];
  for (let i = 1; i < count; i += 1) {
    let cut = Math.round((i * words.length) / count);
    for (const delta of [0, 1, -1, 2, -2]) {
      const candidate = cut + delta;
      if (candidate > (cuts.at(-1) || 0) + 2 && candidate < words.length - 2 && /[,;:—]$/.test(words[candidate - 1])) { cut = candidate; break; }
    }
    cuts.push(cut);
  }
  return [0, ...cuts].map((start, index) => words.slice(start, cuts[index] ?? words.length).join(' '));
}
const captionChunks = [];
SCENES.forEach((scene) => scene.sentences.forEach((line) => {
  const groups = splitCaption(line.text);
  const total = groups.reduce((sum, group) => sum + group.length, 0);
  let cursor = line.start;
  groups.forEach((group) => {
    const length = (line.end - line.start) * (group.length / total);
    captionChunks.push({ text: group, start: cursor, end: cursor + length });
    cursor += length;
  });
}));
const captionEl = document.querySelector('#caption span');
function updateCaption(t) {
  const chunk = captionChunks.find((item, index) => t >= item.start - 0.05 && t < Math.max(item.end + 0.25, (captionChunks[index + 1]?.start ?? Infinity) - 0.05) && t < item.end + 0.9);
  const text = chunk ? chunk.text : '';
  if (captionEl.textContent !== text) captionEl.textContent = text;
}

const CHAPTERS = { problem: ['01', 'The problem'], solution: ['02', 'The solution'], customer: ['03', 'Customer'], merchant: ['04', 'Company'], tracking: ['05', 'Live tracking'], payment: ['06', 'Payment & review'], admin: ['07', 'Super admin'], stack: ['08', 'Technology'], impact: ['09', 'Impact'], roadmap: ['10', 'Roadmap'] };
const chapterEl = document.getElementById('chapter');
const chromeEl = document.getElementById('chrome');
const progressEl = document.querySelector('#progress i');

/* ============================================================ 3D WORLD */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(1920, 1080, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const world = new THREE.Scene();
world.background = new THREE.Color(0x040914);
world.fog = new THREE.Fog(0x040914, 45, 150);
const camera = new THREE.PerspectiveCamera(38, 1920 / 1080, 0.1, 600);
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1);
composer.setSize(1920, 1080);
composer.addPass(new RenderPass(world, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1920, 1080), 0.6, 0.5, 0.7));
composer.addPass(new OutputPass());
world.add(new THREE.HemisphereLight(0x9fb7ff, 0x050a16, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(12, 24, 16);
world.add(sun);

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const GLOW = glowTexture();
function iconTexture(name, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.font = '170px "Material Symbols Outlined"';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 24;
  g.fillText(name, 128, 136);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const halo = (color, size, opacity = 1) => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.scale.set(size, size, 1);
  sprite.userData.baseOpacity = opacity;
  sprite.material.userData.baseOpacity = opacity;
  return sprite;
};

/* ---------- stars ---------- */
const starRandom = seeded(7);
const starPositions = new Float32Array(2600 * 3);
for (let i = 0; i < 2600; i += 1) {
  const r = 70 + starRandom() * 140;
  const theta = starRandom() * Math.PI * 2;
  const phi = Math.acos(2 * starRandom() - 1);
  starPositions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.6, r * Math.sin(phi) * Math.sin(theta)], i * 3);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ size: 0.9, map: GLOW, color: 0xa9c4ff, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
world.add(stars);

/* ---------- floor grid ---------- */
const grid = new THREE.GridHelper(260, 104, 0x1d4ed8, 0x12274a);
grid.position.y = -7;
grid.material.transparent = true;
grid.material.opacity = 0.32;
grid.material.depthWrite = false;
world.add(grid);
const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ map: GLOW, color: 0x2563eb, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
floorGlow.rotation.x = -Math.PI / 2;
floorGlow.position.y = -6.95;
world.add(floorGlow);

/* ---------- network: customer · company · admin around the database ---------- */
const net = new THREE.Group();
world.add(net);
const netMaterials = [];
const track = (material) => { material.transparent = true; material.userData.baseOpacity = material.opacity; netMaterials.push(material); return material; };
const CORE = new THREE.Vector3(0, 0, -1);
const NODES = [
  { id: 'customer', pos: new THREE.Vector3(-9.5, -1, 2), color: 0x22d3ee, icon: 'person', name: 'Customer', sub: 'Requests a service' },
  { id: 'company', pos: new THREE.Vector3(9.5, -1, 2), color: 0x3b82f6, icon: 'storefront', name: 'Business', sub: 'Accepts & dispatches' },
  { id: 'admin', pos: new THREE.Vector3(0, 5.5, -8), color: 0xa78bfa, icon: 'admin_panel_settings', name: 'Super admin', sub: 'Verifies & oversees' },
];
const core = new THREE.Group();
core.position.copy(CORE);
const coreShell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), track(new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, opacity: 0.55 })));
const coreInner = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 3), track(new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x2563eb, emissiveIntensity: 1.4, roughness: 0.25, metalness: 0.3, opacity: 1 })));
const coreHalo = halo(0x38bdf8, 11, 0.7);
core.add(coreShell, coreInner, coreHalo);
net.add(core);
NODES.forEach((node) => {
  const group = new THREE.Group();
  group.position.copy(node.pos);
  const tileGeometry = new RoundedBoxGeometry(3.4, 3.4, 0.6, 4, 0.32);
  const tile = new THREE.Mesh(tileGeometry, track(new THREE.MeshStandardMaterial({ color: 0x0a1428, emissive: node.color, emissiveIntensity: 0.07, metalness: 0.7, roughness: 0.22, opacity: 1 })));
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(tileGeometry, 35), track(new THREE.LineBasicMaterial({ color: node.color, opacity: 0.9 })));
  const hex = `#${node.color.toString(16).padStart(6, '0')}`;
  const icon = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), track(new THREE.MeshBasicMaterial({ map: iconTexture(node.icon, hex), opacity: 1, depthWrite: false })));
  icon.position.z = 0.34;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.06, 12, 120), track(new THREE.MeshBasicMaterial({ color: node.color, opacity: 0.9, blending: THREE.AdditiveBlending })));
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.025, 8, 120), track(new THREE.MeshBasicMaterial({ color: node.color, opacity: 0.45, blending: THREE.AdditiveBlending })));
  const glow = halo(node.color, 11, 0.32);
  group.add(glow, tile, outline, icon, ring, ring2);
  net.add(group);
  const mid = node.pos.clone().add(CORE).multiplyScalar(0.5).add(new THREE.Vector3(0, 3.2, 0));
  const curve = new THREE.QuadraticBezierCurve3(node.pos.clone(), mid, CORE.clone());
  const beam = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.05, 8), track(new THREE.MeshBasicMaterial({ color: node.color, opacity: 0.5, blending: THREE.AdditiveBlending })));
  net.add(beam);
  const pulses = [0, 1, 2].map(() => { const sprite = halo(node.color, 1.4, 1); netMaterials.push(sprite.material); net.add(sprite); return sprite; });
  Object.assign(node, { group, tile, ring, ring2, glow, curve, pulses });
});
const packet = halo(0xffffff, 2.4, 1);
const packetCore = halo(0xfbbf24, 1.2, 1);
world.add(packet, packetCore);

/* ---------- chaos → constellation dots ---------- */
const DOTS = 150;
const dotRandom = seeded(42);
const chaos = [];
const order = [];
for (let i = 0; i < DOTS; i += 1) {
  chaos.push(new THREE.Vector3((dotRandom() - 0.5) * 72, -6 + dotRandom() * 20, -52 + dotRandom() * 36));
  const y = 1 - (i / (DOTS - 1)) * 2;
  const radius = Math.sqrt(1 - y * y);
  const theta = i * 2.399963;
  order.push(new THREE.Vector3(Math.cos(theta) * radius * 14, y * 8 + 1, Math.sin(theta) * radius * 14 - 16));
}
const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ transparent: true }), DOTS);
world.add(dots);
const links = [];
order.forEach((point, i) => {
  order.map((other, j) => [j, point.distanceTo(other)]).filter(([j]) => j > i).sort((a, b) => a[1] - b[1]).slice(0, 3).forEach(([j]) => links.push([i, j]));
});
const linkPositions = new Float32Array(links.length * 6);
const linkGeometry = new THREE.BufferGeometry();
linkGeometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
const linkLines = new THREE.LineSegments(linkGeometry, new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
world.add(linkLines);
const dotMatrix = new THREE.Matrix4();
const dotColor = new THREE.Color();
const tmp = new THREE.Vector3();

/* ---------- the city for live tracking ---------- */
const CITY = new THREE.Vector3(80, -3, 0);
const city = new THREE.Group();
city.position.copy(CITY);
world.add(city);
const GRIDN = 6;
const BLOCK = 2.4;
const ROAD = 0.9;
const SIZE = GRIDN * BLOCK + (GRIDN + 1) * ROAD;
const roadAt = (index) => -SIZE / 2 + ROAD / 2 + index * (BLOCK + ROAD);
const blockAt = (index) => -SIZE / 2 + ROAD + BLOCK / 2 + index * (BLOCK + ROAD);
const citySlab = new THREE.Mesh(new RoundedBoxGeometry(SIZE + 0.8, 0.5, SIZE + 0.8, 4, 0.25), new THREE.MeshStandardMaterial({ color: 0x0a1426, roughness: 0.9 }));
citySlab.position.y = -0.25;
city.add(citySlab);
const cityRandom = seeded(2481);
const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x15243f, emissive: 0x0b1d3d, emissiveIntensity: 0.6, roughness: 0.5, metalness: 0.3 });
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x3b6fd6, transparent: true, opacity: 0.55 });
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitEdges = new THREE.EdgesGeometry(unitBox);
const windowGlow = [];
for (let x = 0; x < GRIDN; x += 1) {
  for (let z = 0; z < GRIDN; z += 1) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(BLOCK, 0.12, BLOCK), new THREE.MeshStandardMaterial({ color: 0x101c33 }));
    tile.position.set(blockAt(x), 0.06, blockAt(z));
    city.add(tile);
    if ((x === 0 && z === 5) || (x === 4 && z === 0)) continue;
    const parts = cityRandom() < 0.45 ? [[0, 0, 1.7]] : [[-0.55, -0.55, 0.9], [0.55, -0.55, 0.9], [-0.55, 0.55, 0.9], [0.55, 0.55, 0.9]];
    parts.forEach(([dx, dz, w]) => {
      const h = 0.6 + cityRandom() * (w > 1 ? 4.2 : 2.2);
      const building = new THREE.Mesh(unitBox, buildingMaterial);
      building.scale.set(w, h, w);
      building.position.set(blockAt(x) + dx, 0.12 + h / 2, blockAt(z) + dz);
      const edges = new THREE.LineSegments(unitEdges, edgeMaterial);
      edges.scale.copy(building.scale);
      edges.position.copy(building.position);
      city.add(building, edges);
      if (cityRandom() < 0.35) {
        const light = halo(cityRandom() < 0.5 ? 0x22d3ee : 0x3b82f6, 0.9, 0.7);
        light.position.set(building.position.x, 0.12 + h + 0.15, building.position.z);
        city.add(light);
        windowGlow.push(light);
      }
    });
  }
}
// Route: depot (top-left) → along the road → customer block (bottom-right).
const routePoints = [[0, 6], [3, 6], [3, 2], [5, 2], [5, 0]].map(([ix, iz]) => new THREE.Vector3(roadAt(ix), 0.32, roadAt(iz)));
const route = new THREE.CurvePath();
for (let i = 0; i < routePoints.length - 1; i += 1) route.add(new THREE.LineCurve3(routePoints[i], routePoints[i + 1]));
const routeSegments = 240;
city.add(new THREE.Mesh(new THREE.TubeGeometry(route, routeSegments, 0.07, 6, false), new THREE.MeshBasicMaterial({ color: 0x1e3a6e })));
const trail = new THREE.Mesh(new THREE.TubeGeometry(route, routeSegments, 0.13, 8, false), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, blending: THREE.AdditiveBlending }));
city.add(trail);
const van = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.5, 0.55, 2, 0.12), new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 1.2, roughness: 0.3 }));
const vanGlow = halo(0x22d3ee, 3.2, 0.9);
city.add(van, vanGlow);
const destination = new THREE.Vector3(blockAt(4), 0.12, blockAt(0));
const pin = new THREE.Group();
const pinMaterial = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.8, roughness: 0.3 });
const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), pinMaterial);
pinHead.position.y = 1.5;
const pinTip = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.85, 20), pinMaterial);
pinTip.rotation.x = Math.PI;
pinTip.position.y = 0.95;
const pinGlow = halo(0xf59e0b, 3.4, 0.8);
pinGlow.position.y = 1.5;
pin.add(pinHead, pinTip, pinGlow);
pin.position.copy(destination);
city.add(pin);
const rings = [0, 1, 2].map(() => { const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 48), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(destination.x, 0.16, destination.z); city.add(ring); return ring; });
// Two background vans loop the outer ring road so the city feels alive.
const loop = new THREE.CurvePath();
[[0, 0], [6, 0], [6, 6], [0, 6], [0, 0]].map(([ix, iz]) => new THREE.Vector3(roadAt(ix), 0.3, roadAt(iz))).forEach((point, index, list) => { if (index) loop.add(new THREE.LineCurve3(list[index - 1], point)); });
const extraVans = [0, 0.5].map((offset) => { const mesh = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.42, 0.48, 2, 0.1), new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 0.9 })); const glow = halo(0x3b82f6, 2.2, 0.6); city.add(mesh, glow); return { mesh, glow, offset }; });

/* ---------- globe for the SaaS scene ---------- */
const globe = new THREE.Group();
globe.position.set(0, -1.5, -16);
world.add(globe);
const globeMaterials = [];
const gTrack = (material) => { material.transparent = true; material.depthWrite = false; material.userData.baseOpacity = material.opacity; globeMaterials.push(material); return material; };
const R = 10.5;
const latLon = (lat, lon, radius = R) => { const a = THREE.MathUtils.degToRad(lat); const b = THREE.MathUtils.degToRad(lon); return V0(radius * Math.cos(a) * Math.cos(b), radius * Math.sin(a), radius * Math.cos(a) * Math.sin(b)); };
function V0(x, y, z) { return new THREE.Vector3(x, y, z); }
const gridMaterial = gTrack(new THREE.LineBasicMaterial({ color: 0x2f6fe0, opacity: 0.35, blending: THREE.AdditiveBlending }));
for (let lat = -60; lat <= 60; lat += 20) {
  const points = [];
  for (let lon = 0; lon <= 360; lon += 6) points.push(latLon(lat, lon));
  globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
}
for (let lon = 0; lon < 180; lon += 20) {
  const points = [];
  for (let lat = 0; lat <= 360; lat += 6) { const a = THREE.MathUtils.degToRad(lat); const b = THREE.MathUtils.degToRad(lon); points.push(V0(R * Math.cos(a) * Math.cos(b), R * Math.sin(a), R * Math.cos(a) * Math.sin(b))); }
  globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
}
globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 32), gTrack(new THREE.MeshBasicMaterial({ color: 0x07122a, opacity: 0.85 }))));
const globeHalo = halo(0x2563eb, R * 3.2, 0.26);
globeMaterials.push(globeHalo.material);
globe.add(globeHalo);
const globeRandom = seeded(99);
const cityDots = [];
for (let i = 0; i < 70; i += 1) {
  const dot = halo(globeRandom() < 0.5 ? 0x22d3ee : 0x60a5fa, 0.7, 0.9);
  dot.position.copy(latLon(-50 + globeRandom() * 110, globeRandom() * 360, R * 1.01));
  globeMaterials.push(dot.material);
  globe.add(dot);
  cityDots.push(dot);
}
const PAKISTAN = latLon(30, 70, R * 1.01);
const pakistanDot = halo(0x34d399, 2.6, 1);
pakistanDot.position.copy(PAKISTAN);
globeMaterials.push(pakistanDot.material);
globe.add(pakistanDot);
const DESTINATIONS = [[25, 55], [51, 0], [40, -74], [1, 104], [-33, 151], [35, 139], [52, 13], [24, 46]];
const arcs = DESTINATIONS.map(([lat, lon], index) => {
  const end = latLon(lat, lon, R * 1.01);
  const mid = PAKISTAN.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R * (1.35 + 0.1 * (index % 3)));
  const curve = new THREE.QuadraticBezierCurve3(PAKISTAN.clone(), mid, end);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.045, 6), gTrack(new THREE.MeshBasicMaterial({ color: index % 2 ? 0x22d3ee : 0xa78bfa, opacity: 0.9, blending: THREE.AdditiveBlending })));
  tube.geometry.setDrawRange(0, 0);
  const pulse = halo(0xffffff, 1.1, 1);
  globeMaterials.push(pulse.material);
  globe.add(tube, pulse);
  return { curve, tube, pulse, delay: index * 0.35 };
});
const orbit = new THREE.Mesh(new THREE.TorusGeometry(R * 1.45, 0.04, 8, 160), gTrack(new THREE.MeshBasicMaterial({ color: 0x38bdf8, opacity: 0.5, blending: THREE.AdditiveBlending })));
orbit.rotation.x = Math.PI / 2.3;
globe.add(orbit);

/* ---------- projected labels ---------- */
const labelLayer = document.getElementById('labels');
function makeLabel(html) { const el = document.createElement('div'); el.className = 'node-label'; el.innerHTML = html; el.style.opacity = '0'; labelLayer.appendChild(el); return el; }
NODES.forEach((node) => { node.label = makeLabel(`<b><span class="i" style="color:#${node.color.toString(16).padStart(6, '0')}">${node.icon}</span>${node.name}</b><small>${node.sub}</small>`); });
const coreLabel = makeLabel('<b><span class="i" style="color:#34D399">database</span>MongoDB</b><small>One shared record for every job</small>');
const vanLabel = makeLabel('<b style="font-size:24px;padding:8px 16px"><span class="i" style="color:#22D3EE;font-size:28px">local_shipping</span><span id="van-text">Imran Ali · en route</span></b>');
const pinLabel = makeLabel('<b style="font-size:24px;padding:8px 16px"><span class="i" style="color:#FBBF24;font-size:28px">home_pin</span>Ayesha · DHA Phase 5</b>');
const projected = new THREE.Vector3();
function placeLabel(el, position, opacity, dy = -90, dx = 0) {
  projected.copy(position).project(camera);
  const x = (projected.x * 0.5 + 0.5) * 1920;
  const y = (-projected.y * 0.5 + 0.5) * 1080;
  el.style.transform = `translate(${x + dx}px, ${y + dy}px) translate(-50%, -50%)`;
  el.style.opacity = (projected.z < 1 ? opacity : 0).toFixed(3);
}

/* ---------- camera keyframes per scene ---------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SHOTS = {
  hook: (lt) => [V(0, 1, 36 - lt * 0.5), V(0, 0, 0)],
  problem: (lt) => [V(Math.sin(lt * 0.08) * 4, 3, 32 - lt * 0.2), V(0, 1, -4)],
  solution: (lt) => [V(Math.sin(lt * 0.1) * 3, 7, 41 - lt * 0.3), V(0, 1, -1)],
  customer: (lt) => [V(-6 + lt * 0.2, 4, 30), V(2, 0, 0)],
  merchant: (lt) => [V(Math.sin(lt * 0.1) * 2, 7, 36 - lt * 0.15), V(0, 1, 0)],
  tracking: (lt) => { const a = 0.72 + lt * 0.03; return [V(CITY.x + Math.cos(a) * 34, 27, Math.sin(a) * 34), V(CITY.x + 9.5, 4, 3)]; },
  payment: (lt) => [V(0, 2, 46 - lt * 0.3), V(0, 0, 0)],
  admin: (lt) => [V(Math.sin(lt * 0.12) * 3, 11, 24 - lt * 0.2), V(0, 3.5, -6)],
  stack: (lt) => [V(Math.sin(lt * 0.06) * 6, 4, 38), V(0, 0, -2)],
  saas: (lt) => [V(Math.sin(lt * 0.05) * 5, 3.5, 40 - lt * 0.25), V(0, -1, -12)],
  impact: (lt) => [V(Math.sin(lt * 0.05) * 8, 2.5, 33 - lt * 0.15), V(0, 1, -6)],
  roadmap: (lt) => [V(0, 0.5, 32 - lt * 0.2), V(0, -1, -6)],
  cta: (lt) => [V(Math.sin(lt * 0.15) * 5, 5, 34 - lt * 0.4), V(0, 0.5, -1)],
};
function cameraAt(t) {
  const current = SCENES.find((scene) => t >= scene.start && t < scene.end) || SCENES[SCENES.length - 1];
  const index = BY_ID[current.id].index;
  const [pos, look] = SHOTS[current.id](t - current.start);
  if (index > 0) {
    const previous = SCENES[index - 1];
    const blend = easeInOut(prog(t, current.start, current.id === 'tracking' || previous.id === 'tracking' ? 2.2 : 1.6));
    if (blend < 1) {
      const [pPos, pLook] = SHOTS[previous.id](previous.end - previous.start);
      pos.lerpVectors(pPos, pos, blend);
      look.lerpVectors(pLook, look, blend);
    }
  }
  camera.position.copy(pos);
  camera.lookAt(look);
  camera.updateMatrixWorld();
}

/* ---------- per-scene weights ---------- */
function weight(t, id, fadeIn = 0.8, fadeOut = 0.8) {
  const scene = BY_ID[id];
  return Math.min(easeInOut(prog(t, scene.start - 0.2, fadeIn)), 1 - easeInOut(prog(t, scene.end - fadeOut * 0.5, fadeOut)));
}

function updateWorld(t) {
  cameraAt(t);
  stars.rotation.y = t * 0.006;
  const solution = BY_ID.solution;
  const showNet = Math.max(
    weight(t, 'solution') * easeInOut(prog(t, sentence('solution', 1) - 0.3, 1.2)),
    weight(t, 'merchant') * (1 - 0.85 * easeInOut(prog(t, BY_ID.merchant.start + 1.9, 0.8))),
  );
  net.visible = showNet > 0.01;
  netMaterials.forEach((material) => { material.opacity = material.userData.baseOpacity * showNet; });
  net.scale.setScalar(0.85 + 0.15 * showNet);
  coreShell.rotation.set(t * 0.2, t * 0.3, 0);
  coreInner.rotation.y = -t * 0.4;
  const adminFocus = weight(t, 'admin');
  NODES.forEach((node, i) => {
    node.group.position.y = node.pos.y + Math.sin(t * 1.1 + i * 2) * 0.25;
    node.ring.rotation.z = t * 0.6 * (i % 2 ? 1 : -1);
    node.ring2.rotation.x = Math.sin(t * 0.5 + i) * 0.4;
    const focus = node.id === 'admin' ? 1 + adminFocus * 0.35 : 1 - adminFocus * 0.4;
    node.group.scale.setScalar(focus);
    node.pulses.forEach((sprite, k) => {
      const u = (t * 0.32 + k / 3 + i * 0.13) % 1;
      sprite.position.copy(node.curve.getPoint(i === 1 ? 1 - u : u));
    });
    const labelOn = weight(t, 'solution') * prog(t, sentence('solution', 1) + 0.6 + i * 0.35, 0.6) * (1 - prog(t, solution.end - 0.6, 0.5));
    placeLabel(node.label, tmp.copy(node.group.position).multiplyScalar(net.scale.x).add(net.position), labelOn, node.id === 'admin' ? 0 : 175, node.id === 'admin' ? 250 : 0);
  });
  placeLabel(coreLabel, tmp.copy(CORE).multiplyScalar(net.scale.x), weight(t, 'solution') * prog(t, sentence('solution', 1) + 1.8, 0.6) * (1 - prog(t, solution.end - 0.6, 0.5)), 130);

  // Request packet: customer → database → company, at the start of the company scene.
  const merchant = BY_ID.merchant;
  const p = prog(t, merchant.start + 0.1, 1.9);
  const packetOn = p > 0 && p < 1 ? 1 : 0;
  packet.material.opacity = packetCore.material.opacity = packetOn * showNet;
  if (packetOn) {
    const point = p < 0.5 ? NODES[0].curve.getPoint(easeInOut(p * 2)) : NODES[1].curve.getPoint(1 - easeInOut((p - 0.5) * 2));
    packet.position.copy(point).multiplyScalar(net.scale.x);
    packetCore.position.copy(packet.position);
  }

  // Dots: chaos in the problem scene, a connected constellation for impact.
  const dotVis = Math.max(weight(t, 'problem') * 0.8, weight(t, 'impact') * 0.75, weight(t, 'roadmap') * 0.22, weight(t, 'hook') * 0.35 * prog(t, 2, 3));
  const organised = easeInOut(Math.max(prog(t, BY_ID.impact.start - 0.3, 3.2), t > BY_ID.impact.start ? 1 : 0) * (t > BY_ID.impact.start - 0.3 ? 1 : 0));
  dots.visible = dotVis > 0.01;
  dots.material.opacity = dotVis;
  for (let i = 0; i < DOTS; i += 1) {
    const jitter = (1 - organised) * 0.6;
    tmp.copy(chaos[i]).lerp(order[i], organised);
    tmp.x += Math.sin(t * 2.3 + i * 1.7) * jitter;
    tmp.y += Math.cos(t * 1.9 + i * 2.1) * jitter;
    if (organised > 0.5) tmp.applyAxisAngle(V(0, 1, 0), t * 0.08 * organised);
    const scale = 1 + Math.sin(t * 3 + i) * 0.15 + organised * 0.2;
    dotMatrix.makeScale(scale, scale, scale).setPosition(tmp);
    dots.setMatrixAt(i, dotMatrix);
    dotColor.setHex(i % 3 ? 0xf87171 : 0xfbbf24).lerp(new THREE.Color(i % 4 ? 0x38bdf8 : 0xa78bfa), organised);
    dots.setColorAt(i, dotColor);
  }
  dots.instanceMatrix.needsUpdate = true;
  if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
  linkLines.visible = organised > 0.02 && dotVis > 0.01;
  if (linkLines.visible) {
    const position = new THREE.Vector3();
    const other = new THREE.Vector3();
    const reveal = prog(t, BY_ID.impact.start + 0.4, BY_ID.impact.voiceLength * 0.7);
    links.forEach(([a, b], index) => {
      const shown = index / links.length < reveal;
      dots.getMatrixAt(a, dotMatrix); position.setFromMatrixPosition(dotMatrix);
      dots.getMatrixAt(b, dotMatrix); other.setFromMatrixPosition(dotMatrix);
      if (!shown) other.copy(position);
      linkPositions.set([position.x, position.y, position.z, other.x, other.y, other.z], index * 6);
    });
    linkGeometry.attributes.position.needsUpdate = true;
    linkLines.material.opacity = 0.4 * organised * dotVis;
  }

  // City and the van's trip.
  const tracking = BY_ID.tracking;
  city.visible = t > tracking.start - 3 && t < tracking.end + 3;
  if (city.visible) {
    const arrive = sentence('tracking', 2);
    const tripStart = tracking.start + 0.8;
    const trip = easeInOut(prog(t, tripStart, arrive - tripStart));
    const point = route.getPointAt(trip);
    const ahead = route.getPointAt(Math.min(1, trip + 0.01));
    van.position.copy(point);
    if (ahead.distanceToSquared(point) > 1e-6) van.lookAt(ahead.x + CITY.x, ahead.y + CITY.y, ahead.z + CITY.z);
    van.rotateY(Math.PI / 2);
    vanGlow.position.copy(point).add(V(0, 0.3, 0));
    trail.geometry.setDrawRange(0, Math.floor(trip * routeSegments) * 8 * 6);
    const arrived = t >= arrive;
    const done = t >= sentence('tracking', 4);
    pinMaterial.color.setHex(done ? 0x10b981 : arrived ? 0x22d3ee : 0xf59e0b);
    pinMaterial.emissive.copy(pinMaterial.color);
    pinGlow.material.color.copy(pinMaterial.color);
    pin.position.y = destination.y + Math.sin(t * 2.4) * 0.15;
    rings.forEach((ring, k) => { const u = (t * 0.7 + k / 3) % 1; ring.scale.setScalar(1 + u * 3.5); ring.material.opacity = (1 - u) * 0.75; ring.material.color.copy(pinMaterial.color); });
    extraVans.forEach(({ mesh, glow, offset }) => { const u = (t * 0.045 + offset) % 1; const q = loop.getPointAt(u); const r = loop.getPointAt((u + 0.005) % 1); mesh.position.copy(q); mesh.lookAt(r.x + CITY.x, r.y + CITY.y, r.z + CITY.z); mesh.rotateY(Math.PI / 2); glow.position.copy(q); });
    windowGlow.forEach((light, k) => { light.material.opacity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.5 + k * 1.3)); });
    const cityOn = weight(t, 'tracking');
    const minutes = Math.max(1, Math.ceil((1 - trip) * 14));
    const vanText = document.getElementById('van-text');
    const text = arrived ? 'Imran Ali · arrived' : `Imran Ali · ${minutes} min`;
    if (vanText.textContent !== text) vanText.textContent = text;
    placeLabel(vanLabel, tmp.copy(van.position).add(CITY), cityOn * prog(t, tracking.start + 1, 0.6), -70);
    placeLabel(pinLabel, tmp.copy(destination).add(CITY).add(V(0, 2.2, 0)), cityOn * prog(t, tracking.start + 1.4, 0.6) * (1 - easeOut(prog(trip, 0.62, 0.12))), -50);
  } else {
    vanLabel.style.opacity = '0';
    pinLabel.style.opacity = '0';
  }
  const saas = BY_ID.saas;
  const scaleBeat = sentence('saas', 3);
  const globeVis = weight(t, 'saas') * (0.35 + 0.65 * easeInOut(prog(t, scaleBeat - 0.6, 1.2)));
  globe.visible = globeVis > 0.01;
  if (globe.visible) {
    globeMaterials.forEach((material) => { material.opacity = material.userData.baseOpacity * globeVis; });
    // Start with Pakistan facing the camera, then turn slowly.
    globe.rotation.y = THREE.MathUtils.degToRad(-20) - (t - saas.start) * 0.035;
    globe.rotation.x = 0.35;
    const reach = prog(t, scaleBeat + 3.6, 3.2);
    arcs.forEach((arc) => {
      const p = easeInOut(prog(reach, arc.delay / 4, 0.45));
      arc.tube.geometry.setDrawRange(0, Math.floor(p * 64) * 6 * 6);
      const u = ((t * 0.5 + arc.delay) % 1) * p;
      arc.pulse.position.copy(arc.curve.getPoint(u));
      arc.pulse.material.opacity = p > 0.02 ? globeVis : 0;
    });
    pakistanDot.scale.setScalar(2.6 + Math.sin(t * 4) * 0.5);
    cityDots.forEach((dot, index) => { dot.material.opacity = globeVis * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2 + index))); });
  }
  grid.material.opacity = 0.32 * (1 - weight(t, 'tracking') * 0.7) + weight(t, 'roadmap') * 0.25;
  if (window.__hidden && window.__map) window.__hidden.forEach((name) => { if (window.__map[name]) window.__map[name].visible = false; });
  if (window.__nobloom) renderer.render(world, camera); else composer.render();
}

/* ============================================================ SCENE DETAILS */
const acceptEl = document.getElementById('accept');
const declineEl = document.getElementById('decline');
const scoreEls = [...document.querySelectorAll('[data-count]')];
const barEls = [...document.querySelectorAll('[data-bar]')];
const statusEl = document.getElementById('trk-status');
const etaEl = document.getElementById('trk-eta');
const etaSubEl = document.getElementById('trk-eta-sub');
const etaLabelEl = document.getElementById('trk-eta-label');
const routeDone = document.getElementById('trk-done');
const routePath = document.getElementById('trk-route');
const routeLength = routePath.getTotalLength();
const vanDot = document.getElementById('trk-van');
const stepEls = [...document.querySelectorAll('#trk-steps span')];
const stepFill = document.querySelector('#trk-steps .fill');
const starEls = [...document.querySelectorAll('#stars span')];
const carouselEl = document.getElementById('carousel');
const carouselCards = [...carouselEl.children];
const roadFill = document.getElementById('road-fill');

function updateDetails(t) {
  // Company accepts the request.
  const press = sentence('merchant', 1) + 0.75;
  const pressP = prog(t, press, 0.35);
  acceptEl.style.transform = `scale(${1 - Math.sin(pressP * Math.PI) * 0.06})`;
  acceptEl.style.boxShadow = t >= press ? '0 0 0 6px rgba(52,211,153,.35), 0 16px 40px -14px rgba(16,185,129,.9)' : '';
  acceptEl.lastChild.textContent = t >= press + 0.2 ? 'Accepted' : 'Accept';
  declineEl.style.opacity = t >= press + 0.2 ? '0.45' : '1';
  const rankP = easeOut(prog(t, sentence('merchant', 2) + 0.4, 1.5));
  scoreEls.forEach((el) => { el.textContent = (Number(el.dataset.count) * rankP).toFixed(1); });
  barEls.forEach((el) => { el.style.width = `${Number(el.dataset.bar) * rankP * 100}%`; });

  // Live tracking phone.
  const tracking = BY_ID.tracking;
  const arrive = sentence('tracking', 2);
  const working = sentence('tracking', 3);
  const done = sentence('tracking', 4);
  const tripStart = tracking.start + 0.8;
  const trip = easeInOut(prog(t, tripStart, arrive - tripStart));
  const minutes = Math.max(1, Math.ceil((1 - trip) * 14));
  const state = t >= done ? 4 : t >= working ? 3 : t >= arrive ? 2 : 1;
  const labels = [null, ['local_shipping', 'En route', ''], ['where_to_vote', 'Arrived', ''], ['construction', 'In progress', 'work'], ['task_alt', 'Completed', 'done']];
  const [icon, label, tone] = labels[state];
  if (statusEl.dataset.state !== String(state)) {
    statusEl.dataset.state = String(state);
    statusEl.className = `status ${tone}`;
    statusEl.innerHTML = `<span class="i">${icon}</span><span>${label}</span>`;
  }
  const etaText = state === 1 ? `${minutes} min` : state === 2 ? 'Arrived' : state === 3 ? 'On site' : 'Done ✓';
  if (etaEl.textContent !== etaText) etaEl.textContent = etaText;
  const sub = state === 1 ? 'Imran Ali is on the way' : state === 2 ? 'Imran Ali is at your door' : state === 3 ? 'Repair in progress' : 'Job completed · invoice ready';
  if (etaSubEl.textContent !== sub) etaSubEl.textContent = sub;
  const etaLabel = state === 1 ? 'Arriving in' : 'Job status';
  if (etaLabelEl.textContent !== etaLabel) etaLabelEl.textContent = etaLabel;
  routeDone.setAttribute('stroke-dashoffset', String(1 - trip));
  const point = routePath.getPointAtLength(trip * routeLength);
  vanDot.setAttribute('transform', `translate(${point.x} ${point.y})`);
  stepEls.forEach((el, index) => { el.className = `i ${index < state ? 'on' : index === state ? 'now' : ''}`; });
  stepFill.style.width = `${(Math.min(state, 4) / 4) * 324}px`;

  // Industry carousel.
  const ringAngle = -(t - BY_ID.saas.start) * 20;
  carouselEl.style.transform = `translateZ(-600px) rotateY(${ringAngle}deg)`;
  carouselCards.forEach((card, index) => {
    const angle = index * 45;
    const facing = Math.cos(THREE.MathUtils.degToRad(angle + ringAngle));
    card.style.transform = `rotateY(${angle}deg) translateZ(600px)`;
    card.style.opacity = (0.12 + 0.88 * clamp((facing + 0.2) / 1.2)).toFixed(3);
  });

  // Review stars.
  const starStart = cue('payment%0.66');
  starEls.forEach((el, index) => el.classList.toggle('on', t >= starStart + index * 0.2));

  // Roadmap line.
  roadFill.style.width = `${easeInOut(prog(t, cue('roadmap%0.15'), cue('roadmap%0.9') - cue('roadmap%0.15'))) * 100}%`;
}

/* ============================================================ FRAME */
function seek(t) {
  sceneEls.forEach(({ el, scene }) => {
    const opacity = sceneOpacity(scene, t);
    el.style.opacity = opacity.toFixed(3);
    el.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
  });
  animated.forEach((item) => applyFx(item, t));
  updateDetails(t);
  updateWorld(t);
  updateCaption(t);
  chromeEl.style.opacity = (Math.min(prog(t, BY_ID.problem.start, 0.6), 1 - prog(t, BY_ID.cta.start - 0.3, 0.5))).toFixed(3);
  progressEl.style.width = `${(t / DURATION) * 100}%`;
}

async function ready() {
  await Promise.all([document.fonts.load('800 40px Inter'), document.fonts.load('40px "Material Symbols Outlined"', 'star')]);
  await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  await document.fonts.ready;
}

window.FILM = { seek, ready: ready(), duration: DURATION, fps: TL.fps, toggle: (name, on) => { const map = { net, core, coreShell, coreInner, coreHalo, packet, packetCore, globe, city, dots, linkLines, stars, grid, floorGlow }; NODES.forEach((node) => { map[`node-${node.id}`] = node.group; map[`tile-${node.id}`] = node.tile; map[`glow-${node.id}`] = node.glow; map[`ring-${node.id}`] = node.ring; node.pulses.forEach((p, k) => { map[`pulse-${node.id}-${k}`] = p; }); map[`icon-${node.id}`] = node.group.children[3]; map[`outline-${node.id}`] = node.group.children[2]; }); window.__hidden = window.__hidden || new Set(); if (on) window.__hidden.delete(name); else window.__hidden.add(name); window.__map = map; }, bright: () => { const c = document.getElementById('gl'); const o = document.createElement('canvas'); o.width = 192; o.height = 108; const g = o.getContext('2d'); g.drawImage(c, 0, 0, 192, 108); const d = g.getImageData(0, 0, 192, 108).data; let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2]; return +(sum / (d.length / 4) / 3).toFixed(2); }, debug: () => ({ camera: camera.position.toArray().map((v) => +v.toFixed(2)), globe: globe.visible, stars: stars.visible, grid: grid.material.opacity }) };
// Preview: film.html?t=12 shows that moment; ?play plays it in real time.
const params = new URLSearchParams(location.search);
await window.FILM.ready;
if (params.has('play')) {
  const begin = performance.now() - Number(params.get('t') || 0) * 1000;
  const tick = () => { const t = (performance.now() - begin) / 1000; seek(t % DURATION); requestAnimationFrame(tick); };
  tick();
} else seek(Number(params.get('t') || 0));
