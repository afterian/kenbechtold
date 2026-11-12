// Photometric-stereo explainers, all 2D canvas (cheap, crisp, printable).

/** A sphere lit by the pointer. Toggle between what a camera sees (shading)
 *  and what the model recovers (the normal map). */
export function initSphere(canvas, toggle) {
  const ctx = canvas.getContext("2d");
  const S = 360;
  canvas.width = S; canvas.height = S;
  const img = ctx.createImageData(S, S);
  let L = [0.45, 0.55, 0.7], target = L.slice(), mode = "shade";
  const norm = (v) => { const m = Math.hypot(...v) || 1; return v.map((x) => x / m); };
  function draw() {
    const d = img.data;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = (i / S) * 2 - 1, y = -((j / S) * 2 - 1), r2 = x * x + y * y, k = (j * S + i) * 4;
      if (r2 > 0.92) { d[k + 3] = 0; continue; }
      const nx = x / 0.96, ny = y / 0.96, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      let rr, gg, bb;
      if (mode === "shade") {
        const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        const v = Math.pow(lam, 1 / 2.2) * 236;
        rr = v; gg = v * 0.98; bb = v * 0.93;
      } else { rr = (nx * 0.5 + 0.5) * 255; gg = (ny * 0.5 + 0.5) * 255; bb = (nz * 0.5 + 0.5) * 255; }
      const edge = Math.min(1, (0.92 - r2) * 40);
      d[k] = rr; d[k + 1] = gg; d[k + 2] = bb; d[k + 3] = 255 * edge;
    }
    ctx.putImageData(img, 0, 0);
    if (mode === "shade") {
      // light marker
      const lx = (L[0] * 0.5 + 0.5) * S, ly = (-L[1] * 0.5 + 0.5) * S;
      ctx.strokeStyle = "#ffb547"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx - 12, ly); ctx.lineTo(lx - 9, ly); ctx.moveTo(lx + 9, ly); ctx.lineTo(lx + 12, ly);
      ctx.moveTo(lx, ly - 12); ctx.lineTo(lx, ly - 9); ctx.moveTo(lx, ly + 9); ctx.lineTo(lx, ly + 12); ctx.stroke();
    }
  }
  let raf = 0, idle = true, t = 0;
  function tick() {
    raf = 0;
    if (idle) { t += 0.012; target = norm([Math.sin(t) * 0.8, 0.45 + Math.cos(t * 0.8) * 0.35, 0.7]); }
    L = norm(L.map((v, i) => v + (target[i] - v) * 0.12));
    draw();
    if (canvas.isConnected && inView) raf = requestAnimationFrame(tick);
  }
  let inView = false;
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; if (inView && !raf) tick(); }).observe(canvas);
  canvas.parentElement.addEventListener("pointermove", (e) => {
    idle = false;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1, y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    target = norm([x * 1.2, y * 1.2, 0.6]);
  });
  canvas.parentElement.addEventListener("pointerleave", () => (idle = true));
  toggle?.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    toggle.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    draw();
  }));
  draw();
}

/** Decode a real predicted normal map under the pointer: pixel RGB → (x, y, z) arrow. */
export function initDecoder(wrap) {
  const src = wrap.dataset.src;
  const canvas = wrap.querySelector("canvas");
  const read = wrap.querySelector("[data-readout]");
  const arrow = wrap.querySelector("[data-arrow]");
  const im = new Image();
  im.onload = () => {
    // assets/img/geo6_normal_v01.png: square crop of the agent's prediction panel (see _build/prep_images.py)
    const crop = { x: 0, y: 0, w: im.width, h: im.height };
    canvas.width = Math.round(crop.w); canvas.height = Math.round(crop.h);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(im, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
    const show = (px, py) => {
      const p = ctx.getImageData(px, py, 1, 1).data;
      if (p[0] + p[1] + p[2] < 30) return;
      const n = [p[0] / 127.5 - 1, p[1] / 127.5 - 1, p[2] / 127.5 - 1];
      read.innerHTML = `<span style="color:var(--nx)">x ${n[0].toFixed(2)}</span><span style="color:var(--ny)">y ${n[1].toFixed(2)}</span><span style="color:var(--nz)">z ${n[2].toFixed(2)}</span>`;
      const len = 46;
      arrow.setAttribute("x2", 60 + n[0] * len);
      arrow.setAttribute("y2", 60 - n[1] * len);
      wrap.querySelector("[data-swatch]").style.background = `rgb(${p[0]},${p[1]},${p[2]})`;
    };
    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      show(Math.floor(((e.clientX - r.left) / r.width) * canvas.width), Math.floor(((e.clientY - r.top) / r.height) * canvas.height));
    });
    show(Math.floor(canvas.width * 0.32), Math.floor(canvas.height * 0.3));
  };
  im.src = src;
}

/** Tiny dome glyph: where a light sits, seen from the camera. */
export function domeGlyph(dir, size = 44) {
  const [x, y, z] = dir;
  const c = size / 2, r = size / 2 - 3;
  // DiLiGenT light vectors are camera-frame; flip y for screen
  const px = c + x * r, py = c - y * r;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="dome" aria-hidden="true">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--rule-strong)"/>
    <circle cx="${c}" cy="${c}" r="${r * 0.5}" fill="none" stroke="var(--rule)"/>
    <line x1="${c}" y1="${c}" x2="${px}" y2="${py}" stroke="var(--sodium)" stroke-width="1"/>
    <circle cx="${px}" cy="${py}" r="3.2" fill="var(--sodium)"/>
    <circle cx="${c}" cy="${c}" r="1.5" fill="var(--bone-3)"/></svg>`;
}
