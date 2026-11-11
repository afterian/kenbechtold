// 3D for the site: procedural placeholder forms, a live viewer with a shaded/wireframe
// wipe, and an offscreen renderer that makes placeholder stills.
// The forms stand in for real models. buildForm() is the seam where a GLB loader goes:
// anything that returns { geo, wire, tilt, tris, verts } works with the rest unchanged.
// Loaded lazily by ui.js, so pages still work if three.js or WebGL is unavailable.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
// Radius of a superellipse along direction (c, s): evenly spaced angles give evenly spaced quads.
const se = (c, s, e) => (Math.abs(c) ** (2 / e) + Math.abs(s) ** (2 / e)) ** (-e / 2);

export const THEMES = {
  // looks: 0 polished chrome, 1 white ceramic, 2 gunmetal
  dark: {
    wire: '#33ff99', over: '#ffffff', overA: 0.2, clay: '#cfcfcf', env: 1.9, key: 2.4, exposure: 1.2,
    looks: [{ c: '#e6e8ec', m: 1, r: 0.14 }, { c: '#efeee8', m: 0, r: 0.34, coat: 1 }, { c: '#5a5e68', m: 1, r: 0.26 }],
  },
};

/* ---------- seeded helpers ---------- */
function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 3D scalar field: a few octaves of randomly oriented sine waves.
function field(rand, oct = 3, lac = 2) {
  const w = [];
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    for (let i = 0; i < 3; i++) {
      const th = rand() * TAU, z = rand() * 2 - 1, s = Math.sqrt(1 - z * z);
      const f = lac ** o * (0.8 + rand() * 0.5), a = 0.5 ** o;
      w.push([Math.cos(th) * s * f, z * f, Math.sin(th) * s * f, rand() * TAU, a]);
      norm += a;
    }
  }
  return (x, y, z) => {
    let v = 0;
    for (const k of w) v += k[4] * Math.sin(k[0] * x + k[1] * y + k[2] * z + k[3]);
    return v / norm;
  };
}

/* ---------- grid surfaces (quad topology, so wireframes read as quads) ---------- */
function quadLines(R, C) {
  const out = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const i = r * C + c;
      if (c < C - 1) out.push(i, i + 1);
      if (r < R - 1) out.push(i, i + C);
    }
  }
  return out;
}

function grid(R, C, fn, clampV = false) {
  const n = R * C, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  const p = [0, 0, 0], q = [0, 0, 0], a = [0, 0, 0], b = [0, 0, 0], e = 1e-3;
  let k = 0;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++, k += 3) {
      const u = c / (C - 1), v = r / (R - 1);
      fn(u, v, p);
      pos[k] = p[0]; pos[k + 1] = p[1]; pos[k + 2] = p[2];
      const vn = clampV ? Math.min(Math.max(v, 0.004), 0.996) : v;
      fn(u, vn, q); fn(u + e, vn, a); fn(u, vn + e, b);
      const ax = a[0] - q[0], ay = a[1] - q[1], az = a[2] - q[2];
      const bx = b[0] - q[0], by = b[1] - q[1], bz = b[2] - q[2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nor[k] = nx / l; nor[k + 1] = ny / l; nor[k + 2] = nz / l;
    }
  }
  const idx = [];
  for (let r = 0; r < R - 1; r++) {
    for (let c = 0; c < C - 1; c++) {
      const i = r * C + c;
      idx.push(i, i + 1, i + C, i + 1, i + C + 1, i + C);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return { geo, R, C };
}

const FORMS = {
  blob(rand) {
    const f = field(rand, 3, 2), amp = 0.26 + rand() * 0.16, fr = 1.5 + rand() * 0.7, sy = 0.8 + rand() * 0.3;
    return grid(48, 84, (u, v, o) => {
      const th = u * TAU, ph = v * Math.PI, s = Math.sin(ph);
      const x = s * Math.cos(th), y = Math.cos(ph), z = s * Math.sin(th);
      const r = 1 + amp * f(x * fr, y * fr, z * fr);
      o[0] = x * r; o[1] = y * r * sy; o[2] = z * r;
    }, true);
  },
  shape(rand) {
    const e1 = 0.4 + rand() * 0.2, e2 = 0.3 + rand() * 0.2, tw = (rand() < 0.5 ? -1 : 1) * (1.6 + rand() * 1.6);
    const sy = 1.3 + rand() * 0.5, taper = rand() * 0.35;
    return grid(72, 88, (u, v, o) => {
      const th = u * TAU, ph = (v - 0.5) * Math.PI;
      const r1 = se(Math.cos(ph), Math.sin(ph), e1), r2 = se(Math.cos(th), Math.sin(th), e2);
      const c = r1 * Math.cos(ph), y = r1 * Math.sin(ph), x = c * r2 * Math.cos(th), z = c * r2 * Math.sin(th);
      const a = tw * y, ca = Math.cos(a), sa = Math.sin(a), k = 1 - taper * y;
      o[0] = (x * ca - z * sa) * k; o[1] = y * sy; o[2] = (x * sa + z * ca) * k;
    }, true);
  },
  ring(rand) {
    const e = 0.5 + rand() * 0.3, a = 0.26 + rand() * 0.08, asp = 0.7 + rand() * 0.9, tw = 1 + Math.floor(rand() * 2);
    return grid(36, 132, (u, v, o) => {
      const th = u * TAU, ph = v * TAU, al = tw * Math.PI * u;
      const rs = se(Math.cos(ph), Math.sin(ph), e), lx = a * rs * Math.cos(ph), ly = a * asp * rs * Math.sin(ph);
      const rx = lx * Math.cos(al) - ly * Math.sin(al), ry = lx * Math.sin(al) + ly * Math.cos(al);
      o[0] = (1 + rx) * Math.cos(th); o[1] = ry; o[2] = (1 + rx) * Math.sin(th);
    });
  },
  vase(rand) {
    const a1 = 2 + rand() * 3, p1 = rand() * TAU, a2 = 5 + rand() * 4, p2 = rand() * TAU;
    const n = 6 + Math.floor(rand() * 10), d = 0.03 + rand() * 0.05, tw = (rand() - 0.5) * 8;
    return grid(56, 96, (u, v, o) => {
      const th = u * TAU;
      const r = (0.5 + 0.22 * Math.sin(v * a1 + p1) + 0.1 * Math.sin(v * a2 + p2)) * (1 + d * Math.sin(n * th + tw * v));
      o[0] = r * Math.cos(th); o[1] = (v - 0.5) * 2.3; o[2] = r * Math.sin(th);
    });
  },
  terrain(rand) {
    const f = field(rand, 4, 2.1), h = 0.34 + rand() * 0.2;
    return grid(60, 60, (u, v, o) => {
      const x = (u - 0.5) * 2.6, z = (v - 0.5) * 2.6, m = Math.exp(-(x * x + z * z) * 0.35);
      o[0] = x; o[1] = h * f(x * 1.3, 0.3, z * 1.3) * (0.4 + m); o[2] = z;
    });
  },
  ribbon(rand) {
    const k = 2 + Math.floor(rand() * 3), hw = 0.34 + rand() * 0.12, wob = 0.1 + rand() * 0.1, m = 2 + Math.floor(rand() * 2);
    return grid(18, 180, (u, v, o) => {
      const th = u * TAU, w = (v - 0.5) * 2 * hw, a = (k * th) / 2;
      const R = 1 + wob * Math.cos(m * th) + w * Math.cos(a);
      o[0] = R * Math.cos(th); o[1] = w * Math.sin(a) + wob * Math.sin(m * th); o[2] = R * Math.sin(th);
    });
  },
  knot(rand) {
    const [p, q] = [[2, 3], [3, 2], [3, 4], [2, 5]][Math.floor(rand() * 4)];
    const geo = new THREE.TorusKnotGeometry(0.6, 0.17 + rand() * 0.06, 200, 16, p, q);
    return { geo, R: 201, C: 17 };
  },
};

const TILT = {
  blob: [0.3, 0, 0.1], shape: [0.3, 0.6, 0.14], ring: [0.95, 0, 0.3],
  vase: [0.22, 0, 0.08], terrain: [0.55, 0.6, 0], knot: [0.15, 0, 0], ribbon: [0.75, 0.3, 0.2],
};

const formCache = new Map();
export function buildForm(form, seed = 1) {
  const key = form + ':' + seed;
  if (formCache.has(key)) return formCache.get(key);
  const { geo, R, C } = (FORMS[form] || FORMS.blob)(rng(seed * 7919 + 13));
  // Fit to a unit sphere so every form frames the same way.
  geo.center();
  geo.computeBoundingSphere();
  const s = 1 / geo.boundingSphere.radius;
  geo.scale(s, s, s);
  const wire = new THREE.BufferGeometry();
  wire.setAttribute('position', geo.attributes.position);
  wire.setIndex(quadLines(R, C));
  const out = { geo, wire, tilt: TILT[form] || [0, 0, 0], tris: geo.index.count / 3, verts: geo.attributes.position.count };
  formCache.set(key, out);
  return out;
}

/* ---------- scene rig shared by the live viewer and the still renderer ---------- */
function makeRig(renderer, themeName) {
  const T = { ...(THEMES[themeName] || THEMES.dark) };
  // Wireframes take the site accent from CSS, so --acc is the single source of truth.
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim();
  if (acc) T.wire = acc;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
  const key = new THREE.DirectionalLight(0xffffff, T.key);
  key.position.set(2.5, 4, 3.5);
  const rim = new THREE.DirectionalLight(0xffffff, T.key * 0.8);
  rim.position.set(-4, 1.5, -3);
  scene.add(key, rim);
  if (T.amb) scene.add(new THREE.AmbientLight(0xffffff, T.amb));
  const group = new THREE.Group();
  scene.add(group);

  const base = { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
  const mats = {
    shaded: new THREE.MeshPhysicalMaterial({ ...base, envMapIntensity: T.env }),
    clay: new THREE.MeshStandardMaterial({ ...base, color: T.clay, roughness: 0.95, metalness: 0, envMapIntensity: 0.8 }),
    normals: new THREE.MeshNormalMaterial({ ...base }),
    depth: new THREE.MeshBasicMaterial({ ...base, colorWrite: false }),
  };
  // toneMapped: false keeps wireframes at the exact accent color instead of a washed-out one
  const lineMat = new THREE.LineBasicMaterial({ transparent: true, toneMapped: false });
  const ptMat = new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, color: T.wire, toneMapped: false });
  const mesh = new THREE.Mesh(undefined, mats.shaded);
  const lines = new THREE.LineSegments(undefined, lineMat);
  const pts = new THREE.Points(undefined, ptMat);
  group.add(mesh, lines, pts);

  const rig = {
    scene, cam, group, form: null,
    setForm(f) { rig.form = f; mesh.geometry = f.geo; lines.geometry = f.wire; pts.geometry = f.geo; },
    setLook(i) {
      const L = T.looks[i % T.looks.length], m = mats.shaded;
      m.color.set(L.c); m.metalness = L.m; m.roughness = L.r; m.clearcoat = L.coat || 0; m.clearcoatRoughness = 0.15;
    },
    setMode(mode) {
      mesh.material = mode === 'wire' || mode === 'points' ? mats.depth : mats[mode] || mats.shaded;
      lines.visible = mode === 'wire' || mode === 'overlay';
      pts.visible = mode === 'points';
      if (mode === 'overlay') { lineMat.color.set(T.over); lineMat.opacity = T.overA; }
      else { lineMat.color.set(T.wire); lineMat.opacity = 1; }
    },
    fit(aspect, margin = 1.2) {
      const v = (cam.fov * Math.PI) / 360, h = Math.atan(Math.tan(v) * aspect);
      cam.aspect = aspect;
      cam.position.set(0, 0, margin / Math.sin(Math.min(v, h)));
      cam.updateProjectionMatrix();
    },
  };
  return rig;
}

function tune(r, theme) {
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = (THEMES[theme] || {}).exposure || 1;
  return r;
}

/* ---------- live viewer ---------- */
export class Viewer {
  constructor(canvas, o = {}) {
    Object.assign(this, {
      theme: 'dark', form: 'blob', seed: 1, look: 0, mode: 'shaded', alt: 'wire',
      split: null, splitTarget: null, spin: 0.14, drag: true, parallax: 0, margin: 1.2, shift: 0, lift: 0, onFrame: null,
    }, o);
    this.canvas = canvas;
    this.r = tune(new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }), this.theme);
    this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.rig = makeRig(this.r, this.theme);
    this.yaw = 0; this.pitch = 0; this.vy = 0; this.pop = 0;
    this.px = 0; this.py = 0; this.sx = 0; this.sy = 0;
    this.vis = true; this.w = 1; this.h = 1;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) this.spin = 0;
    this.setForm(this.form, this.seed, this.look);
    this.pop = 0;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    new IntersectionObserver((e) => { this.vis = e[0].isIntersecting; }).observe(canvas);
    if (this.drag) this._drag();
    if (this.parallax) {
      addEventListener('pointermove', (e) => {
        this.px = (e.clientX / innerWidth) * 2 - 1;
        this.py = (e.clientY / innerHeight) * 2 - 1;
      }, { passive: true });
    }
    let last = performance.now();
    const loop = (t) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (this.vis && !document.hidden) this.frame(dt);
    };
    requestAnimationFrame(loop);
  }

  get stats() { return { tris: this.rig.form.tris, verts: this.rig.form.verts }; }

  setForm(form, seed = 1, look = 0) {
    this.form = form; this.seed = seed; this.look = look;
    this.rig.setForm(buildForm(form, seed));
    this.rig.setLook(look);
    this.pop = 1;
  }

  resize() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.w = w; this.h = h;
    this.r.setSize(w, h, false);
    this.rig.fit(w / h, this.margin);
  }

  _drag() {
    const c = this.canvas;
    let lx = 0, ly = 0;
    c.style.touchAction = 'pan-y';
    c.style.cursor = 'grab';
    c.addEventListener('pointerdown', (e) => {
      this.dragging = true; lx = e.clientX; ly = e.clientY;
      c.setPointerCapture(e.pointerId); c.style.cursor = 'grabbing';
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      this.yaw += dx * 0.008; this.vy = dx * 0.008;
      this.pitch = Math.max(-1.1, Math.min(1.1, this.pitch + dy * 0.006));
    });
    const end = () => { this.dragging = false; c.style.cursor = 'grab'; };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  frame(dt) {
    if (!this.dragging) { this.yaw += this.spin * dt + this.vy; this.vy *= 0.93; }
    this.sx += (this.px - this.sx) * 0.05;
    this.sy += (this.py - this.sy) * 0.05;
    this.pop *= 0.86;
    if (this.splitTarget != null && this.split != null) this.split += (this.splitTarget - this.split) * Math.min(1, dt * 7);

    const { rig, r, w, h } = this, g = rig.group, t = rig.form.tilt, P = this.parallax;
    g.rotation.set(t[0] + this.pitch + this.sy * 0.18 * P, t[1] + this.yaw + this.sx * 0.35 * P, t[2]);
    g.scale.setScalar(1 - 0.16 * this.pop);
    g.position.x = w / h > 1.25 ? this.shift : 0;
    g.position.y = this.lift;

    const s = this.split;
    if (s == null || s <= 0.002 || s >= 0.998) {
      r.setScissorTest(false);
      rig.setMode(s != null && s <= 0.002 ? this.alt : this.mode);
      r.render(rig.scene, rig.cam);
    } else {
      const x = Math.round(w * s);
      r.setScissorTest(true);
      r.setScissor(0, 0, x, h); rig.setMode(this.mode); r.render(rig.scene, rig.cam);
      r.setScissor(x, 0, w - x, h); rig.setMode(this.alt); r.render(rig.scene, rig.cam);
    }
    if (this.onFrame) this.onFrame(this);
  }
}

/* ---------- still renderer: one offscreen context, transparent WebP out ---------- */
let SR = null;
const rigs = {}, stillCache = new Map(), queue = [];
let busy = false;

function draw({ theme = 'dark', form = 'blob', seed = 1, look = 0, mode = 'shaded', w = 960, h = 600, yaw = 0, margin = 1.25 }) {
  if (!SR) {
    SR = tune(new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }), theme);
    SR.setPixelRatio(1);
  }
  const rig = rigs[theme] || (rigs[theme] = makeRig(SR, theme));
  SR.setSize(w, h, false);
  rig.fit(w / h, margin);
  rig.setForm(buildForm(form, seed));
  rig.setLook(look);
  rig.setMode(mode);
  const t = rig.form.tilt;
  rig.group.rotation.set(t[0], t[1] + yaw, t[2]);
  SR.render(rig.scene, rig.cam);
  // toBlob encodes off the main thread; the object URL keeps memory low.
  return new Promise((res) => SR.domElement.toBlob((blob) => res(blob ? URL.createObjectURL(blob) : ''), 'image/webp', 0.9));
}

// One still per painted frame, so the page stays responsive while placeholders fill in.
function afterFrame(fn) {
  let done = false;
  const go = () => { if (!done) { done = true; fn(); } };
  requestAnimationFrame(() => setTimeout(go, 0));
  setTimeout(go, 400);
}

function pump() {
  if (busy || !queue.length) return;
  busy = true;
  afterFrame(async () => {
    const [o, res] = queue.shift();
    let url = '';
    try { url = await draw(o); } catch (err) { console.error('still failed', err); }
    res(url);
    busy = false;
    pump();
  });
}

export function still(o) {
  const key = JSON.stringify(o);
  if (!stillCache.has(key)) stillCache.set(key, new Promise((res) => { queue.push([o, res]); pump(); }));
  return stillCache.get(key);
}
