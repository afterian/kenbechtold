// Shared behaviour for every page: page transitions, scroll reveal, media placeholders,
// access codes, the lightbox and the 3D viewer controls.
import { PROJECTS, CODES } from './data.js';
import { pixels } from './pixels.js';

// Pixel motion ([data-pixels]) starts itself on every page.
pixels();

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
  if (p.video) {
    const poster = p.poster || p.img;
    return `<div class="${c}"><video src="${ROOT}${p.video}"${poster ? ` poster="${ROOT}${poster}"` : ''} muted loop playsinline preload="none" data-hover aria-label="${p.title}"></video></div>`;
  }
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

/* ---------- video (.mp4) ----------
   videos() upgrades every <video> inside a .media frame. The mode comes from plain HTML:
     controls     player: custom controls with sound, seek and fullscreen
     data-hover   preview: plays while its link, button or frame is hovered or focused
     neither      loop: silent, plays only while it is on screen
   Loops and previews are always muted. Reduced-motion visitors get the poster and a Play button. */
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
export const reducedMotion = () => reduced.matches;
const clock = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const play = (v) => { const p = v.play(); if (p) p.catch(() => {}); };
const players = new Set();

// One observer for all videos: loops play while visible, players pause when they leave the screen.
let vio;
const sync = (v) => { if (v._seen && !v._off) play(v); else v.pause(); };
function watch(v, ratio) {
  vio = vio || new IntersectionObserver((es) => es.forEach((e) => {
    const t = e.target;
    if (t._player) { if (!e.isIntersecting) t.pause(); return; }
    t._seen = e.isIntersecting && e.intersectionRatio >= t._ratio;
    sync(t);
  }), { threshold: [0, 0.25, 0.6] });
  v._ratio = ratio;
  vio.observe(v);
}
function quiet(v) {
  v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = false;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.removeAttribute('autoplay');
  if (v.poster && v.readyState === 0) v.preload = 'none';
}

// Silent loop that only runs while on screen. Also used for the home hero.
export function loopInView(v, wrap) {
  if (v._ratio != null) { sync(v); return; } // already set up: just re-check (the source may have changed)
  quiet(v);
  v._off = reduced.matches;
  if (wrap && !wrap.closest('a, button')) {
    wrap.classList.add('vid', 'vid--loop');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'vid__toggle';
    const label = () => { b.textContent = v.paused ? 'Play' : 'Pause'; b.setAttribute('aria-label', v.paused ? 'Play video' : 'Pause video'); };
    b.addEventListener('click', () => { v._off = !v.paused; v._seen = true; sync(v); });
    v.addEventListener('play', label); v.addEventListener('pause', label);
    label();
    wrap.append(b);
  }
  watch(v, 0.25);
}

function previewOnHover(v, wrap) {
  quiet(v);
  wrap.classList.add('vid', 'vid--hover');
  if (!finePointer.matches) { v._off = reduced.matches; watch(v, 0.6); return; } // touch: play when mostly on screen
  const host = wrap.closest('a, button') || wrap;
  const on = () => { if (!reduced.matches) play(v); }, off = () => v.pause();
  host.addEventListener('pointerenter', on); host.addEventListener('pointerleave', off);
  host.addEventListener('focus', on); host.addEventListener('blur', off);
}

function player(v, wrap) {
  v.controls = false; v.removeAttribute('controls');
  v.playsInline = true; v.setAttribute('playsinline', '');
  if (v.poster && v.readyState === 0) v.preload = 'none';
  v._player = true;
  players.add(v);
  wrap.classList.add('vid', 'vid--player');
  wrap.insertAdjacentHTML('beforeend', `
    <button type="button" class="vid__big" aria-label="Play video"><i>Play</i></button>
    <div class="vid__bar">
      <button type="button" class="vid__play">Play</button>
      <div class="vid__seek" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
      <span class="vid__time">0:00</span>
      <button type="button" class="vid__mute" aria-pressed="true">Sound</button>
      <button type="button" class="vid__full">Full</button>
    </div>`);
  const big = $('.vid__big', wrap), btn = $('.vid__play', wrap), seek = $('.vid__seek', wrap), time = $('.vid__time', wrap), mute = $('.vid__mute', wrap), full = $('.vid__full', wrap);
  let idle;
  const wake = () => {
    wrap.classList.remove('is-idle');
    clearTimeout(idle);
    if (!v.paused) idle = setTimeout(() => wrap.classList.add('is-idle'), 2200);
  };
  const toggle = () => { if (v.paused) play(v); else v.pause(); };
  const paint = () => {
    const d = v.duration, p = d ? v.currentTime / d : 0;
    seek.style.setProperty('--p', p.toFixed(4));
    seek.setAttribute('aria-valuenow', Math.round(p * 100));
    time.textContent = d ? `${clock(v.currentTime)} / ${clock(d)}` : clock(v.currentTime);
  };
  const scrub = (e) => {
    if (!isFinite(v.duration)) return;
    const r = seek.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * v.duration;
    paint();
  };
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (wrap.requestFullscreen) wrap.requestFullscreen().catch(() => {});
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iPhone
  };

  big.addEventListener('click', toggle);
  btn.addEventListener('click', toggle);
  v.addEventListener('click', toggle);
  mute.addEventListener('click', () => { v.muted = !v.muted; });
  full.addEventListener('click', fullscreen);
  v.addEventListener('play', () => {
    players.forEach((o) => { if (o !== v) o.pause(); }); // one voice at a time
    wrap.classList.add('is-playing', 'is-started'); btn.textContent = 'Pause'; wake();
  });
  v.addEventListener('pause', () => { wrap.classList.remove('is-playing'); btn.textContent = 'Play'; wake(); });
  v.addEventListener('volumechange', () => mute.setAttribute('aria-pressed', !v.muted));
  ['timeupdate', 'durationchange', 'loadedmetadata', 'seeked'].forEach((n) => v.addEventListener(n, paint));
  let held = false;
  seek.addEventListener('pointerdown', (e) => {
    held = true;
    try { seek.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ }
    scrub(e);
  });
  seek.addEventListener('pointermove', (e) => { if (held) scrub(e); });
  seek.addEventListener('pointerup', () => { held = false; });
  seek.addEventListener('pointercancel', () => { held = false; });
  wrap.addEventListener('pointermove', wake);
  wrap.addEventListener('pointerleave', () => { if (!v.paused) wrap.classList.add('is-idle'); });
  wrap.addEventListener('focusin', wake);
  wrap.addEventListener('keydown', (e) => {
    const onButton = e.target.closest('button');
    if ((e.key === ' ' || e.key === 'k') && !onButton) { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight' && isFinite(v.duration)) v.currentTime = Math.min(v.duration, v.currentTime + 5);
    else if (e.key === 'ArrowLeft') v.currentTime = Math.max(0, v.currentTime - 5);
    else if (e.key === 'm') v.muted = !v.muted;
    else if (e.key === 'f') fullscreen();
    else return;
    wake();
  });
  mute.setAttribute('aria-pressed', !v.muted);
  watch(v, 0);
}

export function videos(root = document) {
  $$('.media > video:not([data-vdone])', root).forEach((v) => {
    v.dataset.vdone = '1';
    const wrap = v.parentElement;
    if (v.hasAttribute('controls')) player(v, wrap);
    else if (v.dataset.hover != null) previewOnHover(v, wrap);
    else loopInView(v, wrap);
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
  const stage = $('.lb__stage', el);
  let items = [], i = 0, opener = null;
  const stopVideo = () => {
    const old = $('.lb__v', stage);
    if (!old) return;
    const v = $('video', old);
    v.pause(); players.delete(v); vio && vio.unobserve(v);
    v.removeAttribute('src'); v.load(); // stop the download
    old.remove();
  };
  const show = async () => {
    const p = items[i], me = i;
    $('.lb__n', el).textContent = `${pad(i + 1)} / ${pad(items.length)}`;
    $('.lb__t', el).textContent = `${p.title} · ${p.tag} · ${p.year}`;
    stopVideo();
    A.alt = p.title;
    A.style.opacity = 0;
    B.removeAttribute('src');
    el.classList.toggle('lb--photo', !!p.img && !p.video);
    W.hidden = !!p.video || (!!p.img && !p.hover);
    if (p.video) {
      // clips open in the full player, with sound available
      const poster = p.poster || p.img;
      stage.insertAdjacentHTML('beforeend', `<div class="media lb__v"><video src="${ROOT}${p.video}"${poster ? ` poster="${ROOT}${poster}"` : ''} controls playsinline preload="metadata" aria-label="${p.title}"></video></div>`);
      videos(stage);
      return;
    }
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
    stopVideo();
    el.classList.remove('open', 'wire');
    W.setAttribute('aria-pressed', 'false');
    document.documentElement.style.overflow = '';
    if (opener) opener.focus();
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) { if (e.target.classList.contains('lb__stage')) close(); return; }
    if (b.closest('.vid')) return; // the player's own buttons
    if (b.dataset.d) go(+b.dataset.d);
    else if (b === W) b.setAttribute('aria-pressed', el.classList.toggle('wire'));
    else close();
  });
  addEventListener('keydown', (e) => {
    if (!el.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (document.activeElement && document.activeElement.closest('.vid')) return; // arrows seek inside the player
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
