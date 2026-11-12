// Procedural SVG for the "splats → mesh" explainer (plate 14).
// Deterministic (seeded) so screen and PDF match exactly.
const NS = "http://www.w3.org/2000/svg";
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const mk = (tag, a, p) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); p && p.appendChild(e); return e; };

// A loose "Lego bulldozer" silhouette as a union of boxes, used as the hidden target shape.
const BOXES = [[-110, 10, 220, 60], [-70, -40, 110, 50], [-40, -90, 60, 50], [40, -110, 70, 40], [-120, 60, 240, 30]];
const inside = (x, y) => BOXES.some(([bx, by, w, h]) => x > bx && x < bx + w && y > by && y < by + h);

function cams(g) {
  const R = 140;
  mk("ellipse", { cx: 0, cy: 0, rx: R, ry: R * 0.42, fill: "none", stroke: "var(--rule-strong)", "stroke-dasharray": "2 4" }, g);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, x = Math.cos(a) * R, y = Math.sin(a) * R * 0.42;
    const ang = Math.atan2(-y, -x) * 180 / Math.PI;
    const c = mk("g", { transform: `translate(${x} ${y}) rotate(${ang})` }, g);
    mk("path", { d: "M0 0 L18 -9 L18 9 Z", fill: "none", stroke: i % 3 ? "var(--bone-3)" : "var(--bone)", "stroke-width": 1 }, c);
  }
  for (const [bx, by, w, h] of BOXES) mk("rect", { x: bx * 0.45, y: by * 0.45, width: w * 0.45, height: h * 0.45, fill: "var(--ink-3)", stroke: "var(--bone-3)" }, g);
}

function blobs(g, n = 420) {
  seed = 11;
  for (let i = 0; i < n; i++) {
    let x, y, k = 0;
    do { x = (rnd() - 0.5) * 300; y = (rnd() - 0.5) * 260; k++; } while (!inside(x, y) && rnd() > 0.06 && k < 40);
    const a = rnd() * 180, rx = 4 + rnd() * 14, ry = 2 + rnd() * 6;
    const o = inside(x, y) ? 0.18 + rnd() * 0.3 : 0.08 + rnd() * 0.1;
    mk("ellipse", { cx: x, cy: y, rx, ry, transform: `rotate(${a} ${x} ${y})`, fill: "url(#blob)", opacity: o.toFixed(2) }, g);
  }
}

function iso(g) {
  blobs(g, 260);
  g.querySelectorAll("ellipse").forEach((e) => e.setAttribute("opacity", (parseFloat(e.getAttribute("opacity")) * 0.45).toFixed(2)));
  // level set: outline of the union of boxes, slightly inflated
  const d = "M-115 -5 L-75 -5 L-75 -45 L-45 -45 L-45 -95 L35 -95 L35 -115 L115 -115 L115 -65 L75 -65 L75 5 L115 5 L115 95 L-125 95 L-125 55 L-115 55 Z";
  mk("path", { d, fill: "none", stroke: "var(--ncyan)", "stroke-width": 2, "stroke-linejoin": "round", style: "--len:1500" }, g);
  mk("path", { d, fill: "var(--ncyan)", opacity: 0.06 }, g);
  mk("text", { x: 120, y: -122, "font-size": 10, fill: "var(--ncyan)" }, g).textContent = "level set";
}

function mesh(g) {
  // triangulated version of the silhouette
  const pts = [[-90, 60], [-50, 40], [0, 50], [50, 40], [90, 60], [-70, 0], [-20, -10], [30, 0], [70, 10], [-30, -50], [10, -60], [40, -70], [70, -60]];
  const tris = [[0, 1, 5], [1, 2, 6], [1, 5, 6], [2, 3, 7], [2, 6, 7], [3, 4, 8], [3, 7, 8], [5, 6, 9], [6, 9, 10], [6, 7, 10], [7, 10, 11], [7, 8, 12], [7, 11, 12]];
  for (const t of tris) {
    const p = t.map((i) => pts[i].join(" ")).join(" L");
    mk("path", { d: "M" + p + " Z", fill: "var(--ink-3)", stroke: "var(--bone-2)", "stroke-width": 0.8 }, g);
  }
  pts.forEach(([x, y]) => mk("circle", { cx: x, cy: y, r: 2, fill: "var(--bone)" }, g));
}

// "Why photogrammetry needs texture": two views of an object, keypoints, and the matches between them.
function views(g, textured) {
  seed = textured ? 3 : 5;
  const W = 330, H = 200, gap = 100;
  const centers = [];
  for (const fx of [0, W + gap]) {
    mk("rect", { x: fx, y: 0, width: W, height: H, fill: "var(--ink-2)", stroke: "var(--rule-strong)" }, g);
    const cx = fx + W / 2 + (fx ? -14 : 14), cy = H / 2 + 6;
    mk("ellipse", { cx, cy, rx: 110, ry: 72, fill: textured ? "var(--ink-3)" : "#2a2d33", stroke: "var(--bone-3)" }, g);
    if (textured) for (let i = 0; i < 28; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
      mk("rect", { x: cx + Math.cos(a) * r * 92 - 5, y: cy + Math.sin(a) * r * 56 - 4, width: 10, height: 8, fill: "none", stroke: "var(--bone-4)" }, g);
    } else mk("ellipse", { cx: cx - 30, cy: cy - 22, rx: 40, ry: 16, fill: "rgba(236,231,220,.06)" }, g);
    centers.push({ cx, cy });
  }
  seed = textured ? 9 : 13;
  const n = textured ? 34 : 4, col = textured ? "var(--ny)" : "var(--bone-3)";
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
    const dx = Math.cos(a) * r * 92, dy = Math.sin(a) * r * 56;
    const p1 = [centers[0].cx + dx, centers[0].cy + dy], p2 = [centers[1].cx + dx * 0.95 - 6, centers[1].cy + dy];
    mk("circle", { cx: p1[0], cy: p1[1], r: 2.6, fill: col }, g);
    mk("circle", { cx: p2[0], cy: p2[1], r: 2.6, fill: textured ? col : "none", stroke: col }, g);
    if (textured) mk("line", { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], stroke: col, "stroke-width": 0.6, opacity: 0.55, style: `--len:${Math.ceil(p2[0] - p1[0] + 10)}` }, g);
  }
  const mid = W + gap / 2;
  if (!textured) {
    mk("path", { d: `M${mid - 14} ${H / 2 - 14} L${mid + 14} ${H / 2 + 14} M${mid + 14} ${H / 2 - 14} L${mid - 14} ${H / 2 + 14}`, stroke: "var(--bad)", "stroke-width": 2.5 }, g);
    mk("text", { x: mid, y: H / 2 + 40, "text-anchor": "middle", "font-size": 11, fill: "var(--bad)" }, g).textContent = "no matches";
  } else mk("text", { x: mid, y: H + 22, "text-anchor": "middle", "font-size": 11, fill: "var(--ny)" }, g).textContent = "matched keypoints → triangulate";
  mk("text", { x: 8, y: H - 10, "font-size": 10, fill: "var(--bone-3)" }, g).textContent = "view A";
  mk("text", { x: W + gap + 8, y: H - 10, "font-size": 10, fill: "var(--bone-3)" }, g).textContent = "view B";
}

const map = {
  "why-tex": (g) => views(g, true),
  "why-smooth": (g) => views(g, false), "sp-cams": cams, "sp-blobs": blobs, "sp-iso": iso, "sp-mesh": mesh };
for (const [id, f] of Object.entries(map)) { const g = document.getElementById(id); g && f(g); }
