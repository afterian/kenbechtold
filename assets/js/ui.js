// Shared behaviour for every page: page transitions, scroll reveal, media placeholders,
// access codes, the lightbox and the 3D viewer controls.
import { PROJECTS, CODES } from './data.js';

export const ROOT = new URL('../../', import.meta.url).href; // site root, wherever it is hosted
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const pad = (n) => String(n).padStart(2, '0');
export const projectURL = (id) => `${ROOT}work/${id}/`;

/* ---------- 3D is optional ----------
   models.js (and three.js) load on demand. If the CDN or WebGL is unavailable the page
   still renders; <html class="no-3d"> lets CSS hide the 3D-only controls. */
let models;
const no3d = (err) => { console.warn('3D unavailable:', err); document.documentElement.classList.add('no-3d'); return null; };
export function loadModels() {
  models = models || import('./models.js').catch(no3d);
  return models;
}
export async function createViewer(canvas, opts) {
  const m = await loadModels();
  if (!m) return null;
  try { return new m.Viewer(canvas, opts); } catch (err) { return no3d(err); }
}

/* ---------- page transitions: fade out before following an internal link ---------- */
addEventListener('pageshow', () => document.body.classList.remove('leaving'));
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.hasAttribute('download')) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
  e.preventDefault();
  document.body.classList.add('leaving');
  setTimeout(() => { location.href = a.href; }, 240);
});

/* ---------- scroll reveal: [data-reveal] fades up once when it enters the viewport ---------- */
let io;
export function reveal(root = document) {
  io = io || new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]:not(.in)', root).forEach((el) => io.observe(el));
}

/* ---------- media ----------
   media(item) returns the markup for a project or fragment: a real image when the item
   has `img`, otherwise a procedural placeholder (<div class="media" data-still ...>). */
export function media(p, { w = 960, h = 600, hover = true, cls = '' } = {}) {
  const c = `media${cls ? ' ' + cls : ''}`;
  if (p.img) {
    return `<div class="${c}"><img class="media__a" src="${ROOT}${p.img}" alt="${p.title}" loading="lazy">${
      p.hover && hover ? `<img class="media__b" src="${ROOT}${p.hover}" alt="" loading="lazy">` : ''}</div>`;
  }
  return `<div class="${c}" data-still data-form="${p.form}" data-seed="${p.seed}" data-look="${p.look || 0}"${
    hover ? ' data-hover="wire"' : ''} data-w="${w}" data-h="${h}" data-alt="${p.title}"></div>`;
}

// Placeholders render lazily as they near the viewport (data-eager skips the wait).
let sio;
async function loadStill(el) {
  const m = await loadModels();
  if (!m) return;
  const d = el.dataset;
  const o = { form: d.form, seed: +d.seed || 1, look: +d.look || 0, mode: d.mode || 'shaded', w: +d.w || 960, h: +d.h || 600, yaw: +d.yaw || 0 };
  const a = new Image();
  a.className = 'media__a'; a.alt = d.alt || '';
  el.append(a);
  const u = await m.still(o);
  if (!u) return;
  a.onload = () => el.classList.add('ready');
  a.src = u;
  if (!d.hover) return;
  const b = new Image();
  b.className = 'media__b'; b.alt = '';
  el.append(b);
  const w = await m.still({ ...o, mode: d.hover });
  if (w) b.src = w;
}
export function stills(root = document) {
  sio = sio || new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { sio.unobserve(e.target); loadStill(e.target); }
  }), { rootMargin: '60% 0px' });
  $$('[data-still]:not([data-done])', root).forEach((el) => {
    el.dataset.done = '1';
    if (el.dataset.eager != null) loadStill(el); else sio.observe(el);
  });
}

/* ---------- access codes ---------- */
const KEY = 'kb-access';
export const access = {
  get() {
    try { const c = sessionStorage.getItem(KEY); return c && CODES[c] ? { code: c, ...CODES[c] } : null; } catch { return null; }
  },
  set(c) {
    try { if (c) sessionStorage.setItem(KEY, c); else sessionStorage.removeItem(KEY); } catch { /* private mode */ }
  },
};

export function bindCode(root, { onChange }) {
  $$('[data-code]', root).forEach((box) => {
    const form = $('form', box), input = $('input', box), toggle = $('[data-code-toggle]', box);
    if (toggle) toggle.addEventListener('click', () => { box.classList.add('open'); input.focus(); });
    input.addEventListener('input', () => box.classList.remove('bad'));
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { box.classList.remove('open', 'bad'); input.value = ''; input.blur(); } });
    input.addEventListener('blur', () => { if (!input.value) box.classList.remove('open', 'bad'); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const c = input.value.trim().toLowerCase();
      if (CODES[c]) {
        access.set(c);
        input.value = ''; input.blur();
        box.classList.remove('open', 'bad');
        onChange(access.get(), true);
      } else {
        box.classList.remove('bad'); void box.offsetWidth; box.classList.add('bad');
      }
    });
  });
  $$('[data-code-clear]', root).forEach((b) => b.addEventListener('click', () => { access.set(null); onChange(null, false); }));
}

export function paintCode(a) {
  $$('[data-code]').forEach((box) => box.classList.toggle('on', !!a));
  $$('[data-code-name]').forEach((n) => { n.textContent = a ? a.name : ''; });
  $$('[data-code-note]').forEach((n) => { n.textContent = a ? a.note : ''; });
  document.body.classList.toggle('catered', !!a);
}

// Project order for the current visitor: picked projects first when a code is active.
export function ordered(a) {
  const ids = a ? a.order : [];
  const picks = ids.map((id) => PROJECTS.find((p) => p.id === id)).filter(Boolean).map((p) => ({ ...p, picked: true }));
  const rest = PROJECTS.filter((p) => !ids.includes(p.id)).map((p) => ({ ...p }));
  return [...picks, ...rest].map((p, i) => ({ ...p, n: pad(i + 1) }));
}

export function curtain(html, ms = 1700) {
  return new Promise((res) => {
    const c = document.createElement('div');
    c.className = 'curtain';
    c.innerHTML = `<div class="curtain__in">${html}</div>`;
    document.body.append(c);
    requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('show')));
    setTimeout(() => {
      res();
      c.classList.add('hide');
      setTimeout(() => c.remove(), 1000);
    }, ms);
  });
}

/* ---------- lightbox for single pieces ---------- */
export function lightbox() {
  const el = document.createElement('div');
  el.className = 'lb';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Fragment');
  el.innerHTML = `
    <div class="lb__top"><span class="lb__n"></span><span class="lb__t"></span><button type="button" class="lb__x">Close ×</button></div>
    <div class="lb__stage"><img class="lb__a" alt=""><img class="lb__b" alt=""></div>
    <div class="lb__bot"><button type="button" data-d="-1">← Prev</button><button type="button" class="lb__w" aria-pressed="false">Wireframe</button><button type="button" data-d="1">Next →</button></div>`;
  document.body.append(el);
  const A = $('.lb__a', el), B = $('.lb__b', el), W = $('.lb__w', el);
  let items = [], i = 0, opener = null;
  const show = async () => {
    const p = items[i], me = i;
    $('.lb__n', el).textContent = `${pad(i + 1)} / ${pad(items.length)}`;
    $('.lb__t', el).textContent = `${p.title} · ${p.tag} · ${p.year}`;
    A.alt = p.title;
    A.style.opacity = 0;
    B.removeAttribute('src');
    el.classList.toggle('lb--photo', !!p.img);
    W.hidden = !!p.img && !p.hover;
    if (p.img) {
      A.onload = () => { A.style.opacity = ''; };
      A.src = ROOT + p.img;
      if (p.hover) B.src = ROOT + p.hover;
      return;
    }
    const m = await loadModels();
    if (!m) return;
    const o = { form: p.form, seed: p.seed, look: p.look || 0, mode: 'shaded', w: 1500, h: 940, yaw: 0 };
    m.still(o).then((u) => { if (me === i && u) { A.src = u; A.style.opacity = ''; } });
    m.still({ ...o, mode: 'wire' }).then((u) => { if (me === i && u) B.src = u; });
  };
  const go = (d) => { i = (i + d + items.length) % items.length; show(); };
  const close = () => {
    el.classList.remove('open');
    document.documentElement.style.overflow = '';
    if (opener) opener.focus();
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) { if (e.target.classList.contains('lb__stage')) close(); return; }
    if (b.dataset.d) go(+b.dataset.d);
    else if (b === W) b.setAttribute('aria-pressed', el.classList.toggle('wire'));
    else close();
  });
  addEventListener('keydown', (e) => {
    if (!el.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });
  return {
    open(list, at) {
      items = list; i = Math.max(0, at);
      opener = document.activeElement;
      el.classList.add('open');
      document.documentElement.style.overflow = 'hidden';
      show();
      $('.lb__x', el).focus();
    },
  };
}

/* ---------- 3D viewer with wipe-compare ----------
   <div data-viewer data-form="shape" data-seed="21" data-look="0"></div>
   Shaded on the left of the line, the chosen mode on the right. */
const MODES = [['wire', 'Wire'], ['overlay', 'Overlay'], ['normals', 'Normals'], ['clay', 'Clay'], ['points', 'Points']];
export async function viewerUI(el, o = {}) {
  el.classList.add('vw');
  el.innerHTML = `
    <canvas class="vw__c" aria-label="Interactive 3D model. Drag to rotate."></canvas>
    <div class="vw__lab"><span>Shaded</span><span data-alt>Wire</span></div>
    <div class="vw__split" role="slider" tabindex="0" aria-label="Compare shaded and wireframe" aria-valuemin="0" aria-valuemax="100"><i></i></div>
    <div class="vw__stats"></div>
    <div class="vw__bar">
      <div class="vw__modes">${MODES.map(([k, l], i) => `<button type="button" data-m="${k}" aria-pressed="${!i}">${l}</button>`).join('')}</div>
      <button type="button" class="vw__spin" aria-pressed="true">Rotate</button>
    </div>`;
  const v = await createViewer($('canvas', el), { split: 0.5, ...o });
  if (!v) { el.classList.add('vw--off'); return null; }
  const handle = $('.vw__split', el), spin0 = v.spin;
  const setSplit = (s) => {
    v.split = Math.max(0, Math.min(1, s));
    el.style.setProperty('--split', v.split);
    handle.setAttribute('aria-valuenow', Math.round(v.split * 100));
  };
  setSplit(v.split);
  let held = false;
  const move = (e) => { const r = el.getBoundingClientRect(); setSplit((e.clientX - r.left) / r.width); };
  handle.addEventListener('pointerdown', (e) => { held = true; handle.setPointerCapture(e.pointerId); e.preventDefault(); });
  handle.addEventListener('pointermove', (e) => { if (held) move(e); });
  handle.addEventListener('pointerup', () => { held = false; });
  handle.addEventListener('pointercancel', () => { held = false; });
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') setSplit(v.split - 0.05);
    if (e.key === 'ArrowRight') setSplit(v.split + 0.05);
  });
  $('.vw__modes', el).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    v.alt = b.dataset.m;
    $$('.vw__modes button', el).forEach((x) => x.setAttribute('aria-pressed', x === b));
    $('[data-alt]', el).textContent = b.textContent;
    if (v.split > 0.9) setSplit(0.5);
  });
  $('.vw__spin', el).addEventListener('click', (e) => {
    v.spin = v.spin ? 0 : spin0 || 0.14;
    e.currentTarget.setAttribute('aria-pressed', !!v.spin);
  });
  const s = v.stats;
  $('.vw__stats', el).innerHTML = `<span>${s.tris.toLocaleString()} tris</span><span>${s.verts.toLocaleString()} verts</span>`;
  return v;
}
