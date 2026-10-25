import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// A small 3D city: jobs appear as pins, a service van drives the roads to each
// one and the pin turns green on arrival. Drag to turn the city.

const PALETTES = {
  light: {
    road: 0xdfe7f3, block: 0xffffff, buildings: [0xffffff, 0xf4f8ff, 0xe8f0fd, 0xdce8fb], tower: 0x2563eb, towerEmissive: 0x000000,
    tree: 0x34d399, route: 0x93b4f5, trail: 0x2563eb, van: 0x0891b2, pending: 0xf59e0b, done: 0x10b981, beacon: 0x2563eb,
    sky: 0xffffff, ground: 0xb9c8e2, hemi: 1.6, sun: 2.2,
  },
  dark: {
    road: 0x0d182b, block: 0x1a2a46, buildings: [0x243759, 0x2b4170, 0x334b7c, 0x22355a], tower: 0x3e74e8, towerEmissive: 0x1d4ed8,
    tree: 0x10b981, route: 0x284b8a, trail: 0x60a5fa, van: 0x22d3ee, pending: 0xfbbf24, done: 0x34d399, beacon: 0x60a5fa,
    sky: 0xa9c1ff, ground: 0x0b1424, hemi: 1.15, sun: 1.7,
  },
};

const GRID = 5;
const BLOCK = 1.5;
const ROAD = 0.5;
const SIZE = GRID * BLOCK + (GRID + 1) * ROAD;
const DEPOT = { x: 2, z: 2 };
const STATUS_TEXT = { pending: 'New request', enroute: 'En route', arrived: 'Arrived' };

const roadAt = (index) => -SIZE / 2 + ROAD / 2 + index * (BLOCK + ROAD);
const blockAt = (index) => -SIZE / 2 + ROAD + BLOCK / 2 + index * (BLOCK + ROAD);

function seeded(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function HeroScene({ className = '', shift = 0 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return undefined; // No WebGL: the CSS backdrop behind the card remains.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = 'hero-scene__canvas';
    mount.appendChild(renderer.domElement);

    const labelLayer = document.createElement('div');
    labelLayer.className = 'hero-scene__labels';
    mount.appendChild(labelLayer);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    const city = new THREE.Group();
    scene.add(city);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(-6, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    sun.shadow.bias = -0.0008;
    sun.shadow.radius = 4;
    scene.add(sun);

    const disposables = [];
    const track = (item) => { disposables.push(item); return item; };

    // Base slab = roads; raised tiles = blocks.
    const slabMaterial = track(new THREE.MeshStandardMaterial({ roughness: 0.9 }));
    const slab = new THREE.Mesh(track(new RoundedBoxGeometry(SIZE + 0.5, 0.5, SIZE + 0.5, 4, 0.22)), slabMaterial);
    slab.position.y = -0.25;
    slab.receiveShadow = true;
    city.add(slab);

    const blockMaterial = track(new THREE.MeshStandardMaterial({ roughness: 0.85 }));
    const blockGeometry = track(new RoundedBoxGeometry(BLOCK, 0.1, BLOCK, 2, 0.05));
    const blocks = new THREE.InstancedMesh(blockGeometry, blockMaterial, GRID * GRID);
    blocks.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    for (let x = 0; x < GRID; x += 1) {
      for (let z = 0; z < GRID; z += 1) {
        matrix.makeTranslation(blockAt(x), 0.05, blockAt(z));
        blocks.setMatrixAt(x * GRID + z, matrix);
      }
    }
    city.add(blocks);

    // Buildings and parks, laid out from a fixed seed so the city never changes.
    const random = seeded(2481);
    const buildingSlots = [];
    const treeSlots = [];
    for (let x = 0; x < GRID; x += 1) {
      for (let z = 0; z < GRID; z += 1) {
        const cx = blockAt(x);
        const cz = blockAt(z);
        if (x === DEPOT.x && z === DEPOT.z) continue;
        const kind = random();
        if (kind < 0.16) {
          for (let t = 0; t < 4; t += 1) treeSlots.push([cx + (random() - 0.5) * 1.0, cz + (random() - 0.5) * 1.0, 0.7 + random() * 0.6]);
        } else if (kind < 0.55) {
          buildingSlots.push([cx, cz, 0.95, 0.95, 0.5 + random() * 1.5]);
        } else {
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dz]) => {
            if (random() < 0.15) treeSlots.push([cx + dx * 0.34, cz + dz * 0.34, 0.8]);
            else buildingSlots.push([cx + dx * 0.34, cz + dz * 0.34, 0.5, 0.5, 0.3 + random() * 0.9]);
          });
        }
      }
    }
    const buildingMaterial = track(new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }));
    const buildings = new THREE.InstancedMesh(track(new RoundedBoxGeometry(1, 1, 1, 2, 0.06)), buildingMaterial, buildingSlots.length);
    buildings.castShadow = true;
    buildings.receiveShadow = true;
    buildingSlots.forEach(([x, z, w, d, h], index) => {
      matrix.compose(new THREE.Vector3(x, 0.1 + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d));
      buildings.setMatrixAt(index, matrix);
    });
    city.add(buildings);

    const treeMaterial = track(new THREE.MeshStandardMaterial({ roughness: 0.7 }));
    const trees = new THREE.InstancedMesh(track(new THREE.ConeGeometry(0.16, 0.5, 7)), treeMaterial, Math.max(1, treeSlots.length));
    trees.castShadow = true;
    trees.count = treeSlots.length;
    treeSlots.forEach(([x, z, s], index) => {
      matrix.compose(new THREE.Vector3(x, 0.1 + 0.25 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
      trees.setMatrixAt(index, matrix);
    });
    city.add(trees);

    // The company depot: a tall tower with a floating beacon.
    const towerMaterial = track(new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.2 }));
    const tower = new THREE.Mesh(track(new RoundedBoxGeometry(0.95, 2.6, 0.95, 3, 0.1)), towerMaterial);
    tower.position.set(blockAt(DEPOT.x), 1.4, blockAt(DEPOT.z));
    tower.castShadow = true;
    city.add(tower);
    const beaconMaterial = track(new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.3, emissiveIntensity: 0.6 }));
    const beacon = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.28)), beaconMaterial);
    beacon.position.set(tower.position.x, 3.25, tower.position.z);
    city.add(beacon);

    const glow = track(glowTexture());

    // Jobs: each one is a pin, a route along the roads and a van.
    const pinHead = track(new THREE.SphereGeometry(0.16, 20, 16));
    const pinTip = track(new THREE.ConeGeometry(0.1, 0.3, 16));
    const ringGeometry = track(new THREE.RingGeometry(0.16, 0.22, 40));
    const vanGeometry = track(new RoundedBoxGeometry(0.36, 0.2, 0.22, 2, 0.05));
    const used = new Set([`${DEPOT.x}:${DEPOT.z}`]);

    function pickTarget() {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const x = Math.floor(Math.random() * GRID);
        const z = Math.floor(Math.random() * GRID);
        const key = `${x}:${z}`;
        if (!used.has(key) && Math.abs(x - DEPOT.x) + Math.abs(z - DEPOT.z) > 1) { used.add(key); return { x, z, key }; }
      }
      return { x: 0, z: 0, key: '0:0' };
    }

    function buildPath(target) {
      // Depot's top-left intersection → along X → along Z → the target's corner.
      const start = new THREE.Vector3(roadAt(DEPOT.x), 0.13, roadAt(DEPOT.z));
      const corner = new THREE.Vector3(roadAt(target.x + (target.x > DEPOT.x ? 0 : 1)), 0.13, roadAt(DEPOT.z));
      const end = new THREE.Vector3(corner.x, 0.13, roadAt(target.z + (target.z > DEPOT.z ? 0 : 1)));
      const path = new THREE.CurvePath();
      [[start, corner], [corner, end]].forEach(([a, b]) => { if (a.distanceTo(b) > 0.01) path.add(new THREE.LineCurve3(a.clone(), b.clone())); });
      if (!path.curves.length) path.add(new THREE.LineCurve3(start, start.clone().add(new THREE.Vector3(0.01, 0, 0))));
      return path;
    }

    const palette = () => PALETTES[document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'];

    function makeJob(index) {
      const group = new THREE.Group();
      city.add(group);
      const pinMaterial = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.1, emissiveIntensity: 0.35 });
      const pin = new THREE.Group();
      const head = new THREE.Mesh(pinHead, pinMaterial);
      head.position.y = 0.32;
      const tip = new THREE.Mesh(pinTip, pinMaterial);
      tip.rotation.x = Math.PI;
      tip.position.y = 0.12;
      pin.add(head, tip);
      head.castShadow = true;
      group.add(pin);
      const ringMaterial = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);
      const vanMaterial = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.25, emissiveIntensity: 0.25 });
      const van = new THREE.Mesh(vanGeometry, vanMaterial);
      van.castShadow = true;
      group.add(van);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.set(1.1, 1.1, 1);
      group.add(halo);

      const label = document.createElement('div');
      label.className = 'scene-chip';
      label.style.opacity = '0';
      labelLayer.appendChild(label);

      return { index, group, pin, ring, van, halo, label, pinMaterial, ringMaterial, vanMaterial, route: null, trail: null, phase: 'idle', clock: -index * 2.2, ref: '' };
    }

    const jobs = [0, 1, 2].map(makeJob);

    function startJob(job) {
      if (job.target) used.delete(job.target.key);
      job.target = pickTarget();
      job.path = buildPath(job.target);
      job.length = job.path.getLength();
      [job.route, job.trail].forEach((mesh) => { if (mesh) { job.group.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); } });
      const tube = new THREE.TubeGeometry(job.path, 64, 0.035, 6, false);
      job.route = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false }));
      job.trail = new THREE.Mesh(new THREE.TubeGeometry(job.path, 64, 0.055, 6, false), new THREE.MeshBasicMaterial({ transparent: true }));
      job.trail.geometry.setDrawRange(0, 0);
      job.group.add(job.route, job.trail);
      const destination = new THREE.Vector3(blockAt(job.target.x), 0.1, blockAt(job.target.z));
      job.pin.position.copy(destination);
      job.ring.position.set(destination.x, 0.12, destination.z);
      job.ref = `FOS-${2400 + Math.floor(Math.random() * 600)}`;
      job.phase = 'pending';
      job.clock = 0;
      applyJobColors(job, palette());
    }

    function applyJobColors(job, colors) {
      const pinColor = job.phase === 'arrived' ? colors.done : job.phase === 'pending' ? colors.pending : colors.beacon;
      job.pinMaterial.color.setHex(pinColor);
      job.pinMaterial.emissive.setHex(pinColor);
      job.ringMaterial.color.setHex(pinColor);
      job.vanMaterial.color.setHex(colors.van);
      job.vanMaterial.emissive.setHex(colors.van);
      job.halo.material.color.setHex(colors.van);
      if (job.route) job.route.material.color.setHex(colors.route);
      if (job.trail) job.trail.material.color.setHex(colors.trail);
    }

    function applyPalette() {
      const colors = palette();
      slabMaterial.color.setHex(colors.road);
      blockMaterial.color.setHex(colors.block);
      const shade = new THREE.Color();
      buildingSlots.forEach((_, index) => buildings.setColorAt(index, shade.setHex(colors.buildings[index % colors.buildings.length])));
      if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
      treeMaterial.color.setHex(colors.tree);
      towerMaterial.color.setHex(colors.tower);
      towerMaterial.emissive.setHex(colors.towerEmissive);
      towerMaterial.emissiveIntensity = 0.35;
      beaconMaterial.color.setHex(colors.beacon);
      beaconMaterial.emissive.setHex(colors.beacon);
      hemi.color.setHex(colors.sky);
      hemi.groundColor.setHex(colors.ground);
      hemi.intensity = colors.hemi;
      sun.intensity = colors.sun;
      jobs.forEach((job) => applyJobColors(job, colors));
      frame(true);
    }

    // Interaction: drag to turn, pointer parallax, slow idle spin.
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const drag = { active: false, lastX: 0, yaw: 0, velocity: 0 };
    const onPointerMove = (event) => {
      const rect = mount.getBoundingClientRect();
      pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      if (drag.active) {
        const delta = event.clientX - drag.lastX;
        drag.lastX = event.clientX;
        drag.yaw += delta * 0.008;
        drag.velocity = delta * 0.008;
        if (!running) frame(true);
      }
    };
    const onPointerDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      drag.active = true;
      drag.lastX = event.clientX;
      mount.setPointerCapture?.(event.pointerId);
      mount.classList.add('is-dragging');
    };
    const onPointerUp = (event) => {
      drag.active = false;
      mount.releasePointerCapture?.(event.pointerId);
      mount.classList.remove('is-dragging');
    };
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerdown', onPointerDown);
    mount.addEventListener('pointerup', onPointerUp);
    mount.addEventListener('pointercancel', onPointerUp);
    const onLeave = () => { pointer.tx = 0; pointer.ty = 0; };
    mount.addEventListener('pointerleave', onLeave);

    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      const aspect = width / height;
      camera.aspect = aspect;
      const wide = window.matchMedia('(min-width: 1024px)').matches;
      const distance = (wide ? 9.4 : 9.8) / (Math.tan(THREE.MathUtils.degToRad(15)) * Math.min(aspect, 1.25));
      const polar = THREE.MathUtils.degToRad(54);
      camera.position.set(0, Math.cos(polar) * distance, Math.sin(polar) * distance);
      camera.lookAt(0, 0.2, 0);
      // On wide layouts the job card sits bottom-left, so frame the city to the right.
      if (wide) camera.setViewOffset(width, height, -width * shift, height * 0.02, width, height);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      frame(true);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const projected = new THREE.Vector3();
    let last = performance.now();
    let elapsed = 0;
    let running = false;
    let visible = true;
    let frameId = 0;

    function updateJob(job, dt) {
      job.clock += dt;
      if (job.phase === 'idle') { if (job.clock >= 0) startJob(job); return; }
      const progress = job.phase === 'enroute' ? Math.min(1, job.clock / Math.max(2.6, job.length * 0.55)) : job.phase === 'pending' ? 0 : 1;
      if (job.phase === 'pending' && job.clock > 1.4) { job.phase = 'enroute'; job.clock = 0; applyJobColors(job, palette()); }
      else if (job.phase === 'enroute' && progress >= 1) { job.phase = 'arrived'; job.clock = 0; applyJobColors(job, palette()); }
      else if (job.phase === 'arrived' && job.clock > 2.4) { job.phase = 'idle'; job.clock = -0.4; }

      const point = job.path.getPointAt(progress);
      const ahead = job.path.getPointAt(Math.min(1, progress + 0.01));
      job.van.position.set(point.x, 0.22, point.z);
      if (ahead.distanceToSquared(point) > 1e-6) job.van.lookAt(ahead.x, 0.22, ahead.z);
      job.van.rotateY(Math.PI / 2);
      job.halo.position.set(point.x, 0.3, point.z);
      const tube = job.trail.geometry;
      tube.setDrawRange(0, Math.floor(progress * 64) * 6 * 6);
      job.pin.position.y = 0.1 + Math.sin(elapsed * 3 + job.index) * 0.06 + (job.phase === 'arrived' ? 0.08 : 0);
      const pulse = (elapsed * 0.9 + job.index * 0.3) % 1;
      job.ring.scale.setScalar(1 + pulse * 3.2);
      job.ringMaterial.opacity = (1 - pulse) * (job.phase === 'enroute' ? 0.35 : 0.8);
      const fade = job.phase === 'arrived' ? Math.max(0, 1 - Math.max(0, job.clock - 1.6) / 0.8) : 1;
      job.route.material.opacity = 0.55 * fade;
      job.trail.material.opacity = fade;

      // Floating label above the pin.
      projected.set(job.pin.position.x, 0.95, job.pin.position.z);
      job.group.localToWorld(projected);
      projected.project(camera);
      const x = (projected.x * 0.5 + 0.5) * mount.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * mount.clientHeight;
      const minutes = Math.max(1, Math.ceil((1 - progress) * 14));
      const text = job.phase === 'enroute' ? `${STATUS_TEXT.enroute} · ${minutes} min` : STATUS_TEXT[job.phase] || '';
      if (job.label.dataset.text !== text) {
        job.label.dataset.text = text;
        job.label.dataset.phase = job.phase;
        job.label.innerHTML = `<b>${job.ref}</b><span>${text}</span>`;
      }
      job.label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      job.label.style.opacity = String(fade * (projected.z < 1 ? 1 : 0));
    }

    function frame(force = false) {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!force) {
        elapsed += dt;
        jobs.forEach((job) => updateJob(job, dt));
      }
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      if (!drag.active) { drag.yaw += drag.velocity; drag.velocity *= 0.92; }
      city.rotation.y = -0.6 + (reducedMotion ? 0 : elapsed * 0.04) + drag.yaw + pointer.x * 0.18;
      city.rotation.x = pointer.y * 0.05;
      beacon.rotation.y = elapsed * 1.4;
      beacon.position.y = 3.25 + Math.sin(elapsed * 2) * 0.08;
      renderer.render(scene, camera);
    }

    const loop = () => {
      frame();
      if (running) frameId = window.requestAnimationFrame(loop);
    };
    const setRunning = () => {
      const shouldRun = visible && !document.hidden && !reducedMotion;
      if (shouldRun === running) return;
      running = shouldRun;
      if (running) { last = performance.now(); frameId = window.requestAnimationFrame(loop); }
      else window.cancelAnimationFrame(frameId);
    };
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; setRunning(); });
    intersection.observe(mount);
    document.addEventListener('visibilitychange', setRunning);

    const themeObserver = new MutationObserver(applyPalette);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    applyPalette();
    resize();
    if (reducedMotion) {
      // Static but complete picture: every job mid-route.
      jobs.forEach((job, index) => { startJob(job); job.phase = 'enroute'; job.clock = 0.8 + index; applyJobColors(job, palette()); updateJob(job, 0); });
      frame(true);
    }
    setRunning();
    mount.dataset.ready = 'true';

    return () => {
      running = false;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersection.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', setRunning);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerdown', onPointerDown);
      mount.removeEventListener('pointerup', onPointerUp);
      mount.removeEventListener('pointercancel', onPointerUp);
      mount.removeEventListener('pointerleave', onLeave);
      jobs.forEach((job) => {
        [job.route, job.trail].forEach((mesh) => { if (mesh) { mesh.geometry.dispose(); mesh.material.dispose(); } });
        job.pinMaterial.dispose();
        job.ringMaterial.dispose();
        job.vanMaterial.dispose();
        job.halo.material.dispose();
      });
      disposables.forEach((item) => item.dispose());
      blocks.dispose();
      buildings.dispose();
      trees.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
      mount.replaceChildren();
      delete mount.dataset.ready;
    };
  }, [shift]);

  return <div ref={mountRef} className={`hero-scene ${className}`} role="img" aria-label="Animated 3D city showing service vans driving to customer jobs" />;
}
