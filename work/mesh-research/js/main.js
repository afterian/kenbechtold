// NOCTURNE: page controller.
import { initHero } from "./hero.js";
import { initCompare } from "./compare.js";
import { drawTimeline } from "./timeline.js";
import { initSphere, initDecoder, domeGlyph } from "./photometric.js";
import "./sections.js";
import { initInteract } from "./interact.js";
import { initNoise, initLight, initGloss } from "./summary.js";

const R = window.RESULTS, N = window.NIGHT, PRINT = new URLSearchParams(location.search).has("print");
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TZ = -7;
const clock = (iso) => { const d = new Date(iso); return String((d.getUTCHours() + 24 + TZ) % 24).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0"); };

// ------------------------------------------------------------ live numbers from data
const S = N?.stats || {};
const bind = {
  hours: S.night_hours, jobs: S.gpu_jobs, jobsOk: S.gpu_jobs_ok, gpuh: S.gpu_hours_mutex, owners: S.agent_owners,
  runs: S.run_folders, meshes: S.meshes, manifests: S.run_manifests, envs: S.environments, repos: S.source_repos,
  patches: S.windows_patches, reports: S.reports,
  start: S.night_start_utc && clock(S.night_start_utc), end: S.night_end_utc && clock(S.night_end_utc),
  snapshot: S.snapshot_utc ? new Date(S.snapshot_utc).toISOString().slice(0, 10) + " " + clock(S.snapshot_utc) + " PDT" : R.snapshot,
};
$$("[data-bind]").forEach((e) => { const v = bind[e.dataset.bind]; if (v !== undefined) e.textContent = v; });
$$("[data-count]").forEach((e) => { const v = bind[e.dataset.count]; if (v !== undefined) e.dataset.to = v; });

// ------------------------------------------------------------ split headings into masked lines
$$("[data-split]").forEach((h) => {
  h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i).map((l) => `<span class="split-line"><span>${l}</span></span>`).join("");
});

// ------------------------------------------------------------ odometer counters
function countUp(e) {
  const to = parseFloat(e.dataset.to ?? e.textContent);
  if (isNaN(to)) return;
  const dec = (String(e.dataset.to ?? e.textContent).split(".")[1] || "").length;
  if (PRINT || matchMedia("(prefers-reduced-motion: reduce)").matches) { e.textContent = to.toFixed(dec); return; }
  const t0 = performance.now(), dur = 1600;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur), v = to * (1 - Math.pow(1 - k, 4));
    e.textContent = v.toFixed(dec);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ------------------------------------------------------------ DOM bar charts
function bars(host, rows, { max = 1, digits = 3, hi = [], lo = [], suffix = "" } = {}) {
  host.innerHTML = rows.map((r, i) => `
    <div class="bar ${hi.includes(i) ? "hi" : ""} ${lo.includes(i) ? "lo" : ""}">
      <div class="name">${r.name}${r.note ? `<small>${r.note}</small>` : ""}</div>
      <div class="track"><div class="fill" data-w="${Math.max(0, Math.min(1, r.v / max)) * 100}"></div></div>
      <div class="val">${r.v == null ? "—" : r.v.toFixed(digits) + suffix}</div>
    </div>`).join("");
}
function fillBars(root) { $$(".fill", root).forEach((f) => (f.style.width = f.dataset.w + "%")); }

// Lego silhouette leaderboard
const lego = $("#lego-bars");
if (lego) {
  bars(lego, R.lego.rows.map((r) => ({ name: r.m, note: r.note, v: r.iou })), { max: 1, digits: 3, hi: [0], lo: R.lego.rows.map((r, i) => (r.iou < 0.7 ? i : -1)).filter((i) => i >= 0) });
  [...lego.children].forEach((b, i) => {
    const r = R.lego.rows[i];
    if (r.mesh) { b.dataset.show = "lego:" + r.mesh; b.dataset.tip = `Load <b>${r.m} ${r.note}</b> into the 3D view<br>outline IoU ${r.iou.toFixed(3)}`; }
    else b.dataset.tip = `${r.m} ${r.note}: no display mesh staged`;
  });
}
// Bear F-scores
const bear = $("#bear-bars");
if (bear) {
  const order = ["supernormal", "geo6_lc", "sdm_lc", "geo6_raw", "sdm_raw"];
  const rows = order.map((id) => R.bear.rows.find((r) => r.id === id)).map((r) => ({ name: r.name.replace(" (largest component)", ""), note: r.kind === "derived" ? "largest comp." : "raw", v: r.F }));
  bars(bear, rows, { max: 1, digits: 3, hi: [0, 3] });
}
// Cameras (lower is better → invert into "accuracy" bar, show value)
const cams = $("#cam-bars");
if (cams) {
  cams.innerHTML = R.cameras.calibrated.map((r) => `
    <div class="bar ${r.verdict === "recommended" ? "hi" : ""} ${r.verdict === "reject" ? "lo" : ""}">
      <div class="name">${r.m}</div>
      <div class="track"><div class="fill" data-w="${Math.min(100, (r.center / 80) * 100)}"></div></div>
      <div class="val">${r.center.toFixed(1)}%</div>
    </div>`).join("");
}

// Normal light-count small multiples (SVG slope charts)
function slope(host, view) {
  const data = R.normals.views[view];
  const W = 300, H = 200, l = 34, r = 10, t = 14, b = 28;
  const ymax = 7, ymin = 2;
  const xs = [l, l + (W - l - r) * 0.18, W - r]; // 5, 6, 16 images (log-ish spacing)
  const y = (v) => t + (1 - (v - ymin) / (ymax - ymin)) * (H - t - b);
  const col = { GeoUniPS: "var(--nx)", "LINO-UniPS": "var(--bone)", "Uni MS-PS": "var(--bone-3)" };
  let s = `<svg viewBox="0 0 ${W} ${H}" class="dia draw" role="img" aria-label="View ${view}: error vs number of lights">`;
  for (let v = 2; v <= 7; v++) s += `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--rule)"/><text x="${l - 8}" y="${y(v) + 3.5}" text-anchor="end" font-size="10" fill="var(--bone-3)">${v}°</text>`;
  ["5", "6", "16"].forEach((c, i) => (s += `<rect class="lc-band" data-i="${i}" x="${xs[i] - 9}" y="${t - 4}" width="18" height="${H - t - b + 8}" fill="var(--sodium)" opacity="0"/><text x="${xs[i]}" y="${H - 8}" text-anchor="middle" font-size="10" fill="var(--bone-3)">${c}</text>`));
  for (const [m, vals] of Object.entries(data)) {
    const pts = vals.map((v, i) => `${xs[i]},${y(v)}`).join(" ");
    s += `<polyline points="${pts}" fill="none" stroke="${col[m]}" stroke-width="${m === "GeoUniPS" ? 2 : 1.4}" ${m === "Uni MS-PS" ? 'stroke-dasharray="3 3"' : ""} style="--len:400"/>`;
    vals.forEach((v, i) => (s += `<g data-tip="<b>${m}</b> · view ${view}<br>${R.normals.counts[i]} photos → ${v.toFixed(2)}° mean error"><circle class="hit" cx="${xs[i]}" cy="${y(v)}" r="11"/><circle class="pt" cx="${xs[i]}" cy="${y(v)}" r="${i === 2 ? 3.4 : 2.4}" fill="${col[m]}"/></g>`));
  }
  s += `<text x="${l}" y="10" font-size="11" fill="var(--bone)">VIEW ${view}</text></svg>`;
  host.innerHTML = s + `<div class="lc-read" data-view="${view}"></div>`;
}
$$("[data-slope]").forEach((h) => slope(h, h.dataset.slope));
// photo-count selector: highlight one column across all three charts and label its values
const lcc = $("#lc-ctl");
if (lcc) {
  const box = $(".slopes");
  lcc.innerHTML = `<div class="ctl"><span class="ctl-label"><i class="ia-dot"></i>Highlight a photo count</span><div class="seg">${R.normals.counts.map((c, i) => `<button type="button" data-i="${i}" aria-pressed="false"><span class="k">${i + 1}</span>${c} photos</button>`).join("")}</div></div>`;
  const setI = (i) => {
    $$("button", lcc).forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === i)));
    $$(".lc-band", box).forEach((r) => r.setAttribute("opacity", +r.dataset.i === i ? 0.12 : 0));
    const col = { GeoUniPS: "var(--nx)", "LINO-UniPS": "var(--bone)", "Uni MS-PS": "var(--bone-3)" };
    $$(".lc-read", box).forEach((d) => {
      const vals = R.normals.views[d.dataset.view];
      const best = Math.min(...Object.values(vals).map((a) => a[i]));
      d.innerHTML = `<span class="lc-n">${R.normals.counts[i]} photos</span>` + Object.entries(vals).map(([m, a]) => `<span style="color:${col[m]}" class="${a[i] === best ? "best" : ""}">${m.replace("-UniPS", "").replace("Uni MS-PS", "Uni MS")} ${a[i].toFixed(2)}°</span>`).join("");
    });
    $(".ctl", lcc).classList.remove("attn");
  };
  $$("button", lcc).forEach((b) => (b.onclick = () => setI(+b.dataset.i)));
  setI(2);
  $(".ctl", lcc).classList.add("attn");
}

// OLAT strip with dome glyphs (real light directions from the dataset calibration)
const olat = $("#olat-strip");
if (olat && window.OLAT) {
  olat.innerHTML = window.OLAT.ids.map((id, i) => `
    <figure class="olat" data-reveal style="transition-delay:${i * 90}ms">
      <img src="assets/img/olat/v01_${id}.jpg" alt="Bear lit only by light ${id}" class="mono-photo" loading="eager">
      <figcaption>${domeGlyph(window.OLAT.selected[id], 34)}<span>LIGHT ${id}</span></figcaption>
    </figure>`).join("");
}
// 20-view turntable contact sheet
const sheet = $("#turntable");
if (sheet) sheet.innerHTML = Array.from({ length: 20 }, (_, i) => `<img src="assets/img/olat/v${String(i + 1).padStart(2, "0")}_001.jpg" alt="view ${i + 1}" class="mono-photo">`).join("");

// Agent owners list
const owners = $("#owners");
if (owners && N) {
  const counts = {};
  N.jobs.forEach((j) => (counts[j.owner] = (counts[j.owner] || 0) + 1));
  const laneOf = {}; N.jobs.forEach((j) => (laneOf[j.owner] = j.lane));
  const all = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = all.slice(0, 7), rest = all.slice(7);
  owners.innerHTML = top.map(([o, c]) =>
    `<li><span class="dot" style="background:var(--lane-${laneOf[o]})"></span><span class="o">${o}</span><span class="c">${c}</span></li>`).join("") +
    (rest.length ? `<li><span class="dot" style="background:var(--bone-4)"></span><span class="o">${rest.length} more workstreams</span><span class="c">${rest.reduce((s, x) => s + x[1], 0)}</span></li>` : "");
}

// Method atlas
const atlas = $("#atlas");
if (atlas) atlas.innerHTML = R.atlas.map((m) => `
  <div class="atlas-item" data-reveal>
    <div class="row" style="justify-content:space-between"><span class="chip lane-${m.lane}">${m.lane}</span><span class="st st-${m.status}">${m.status}</span></div>
    <div class="h3 an">${m.name}</div>
    <p class="cap">${m.role}</p>
    <div class="mono am">${m.stat}</div>
  </div>`).join("");

// ------------------------------------------------------------ 3D wells (lazy: limited WebGL contexts)
const wells = {
  hero: (e) => initHero(e),
  "sum-noise": (e) => initNoise(e, e.closest(".tri-panel")?.querySelector("[data-noise-slider]")),
  "sum-light": (e) => initLight(e),
  "sum-gloss": (e) => initGloss(e, e.closest(".tri-panel")?.querySelector("[data-gloss-toggle]")),
  bridge: (e) => initCompare(e, {
    ref: "bear_gt", up: "z", controls: $("#bridge-ctl"), size: 1.85, controlsLabel: "Compare with scan",
    items: [
      { id: "bear_geo6_largest", short: "Six photos · cleaned", label: "GeoUniPS → Open-RNb · largest component" },
      { id: "bear_geo6_raw", short: "Six photos · raw", label: "GeoUniPS → Open-RNb · raw" },
      { id: "bear_supernormal", short: "SuperNormal", label: "SuperNormal 5k" },
      { id: "bear_rnb_quality", short: "Prepared · raw", label: "Prepared normals → Open-RNb · raw" },
    ],
    onShow: (it) => { const t = $("#bridge-label"); if (t) t.textContent = it.label; },
  }),
  progression: (e) => initCompare(e, {
    mode: "solo", up: "z", frame: "bear_gt", controls: $("#prog-ctl"), auto: 0.7, controlsLabel: "Step through passes",
    items: [
      { id: "bear_rnb_smoke", short: "1 · smoke" },
      { id: "bear_rnb_quality", short: "2 · 5k steps" },
      { id: "bear_supernormal", short: "3 · SuperNormal" },
      { id: "bear_geo6_raw", short: "4 · six photos" },
      { id: "bear_gt", short: "Scan", spectrum: 0, tint: 0xd8d2c4 },
    ],
    onShow: (it) => { $$("[data-prog]").forEach((p) => (p.hidden = p.dataset.prog !== it.id)); },
  }),
  lego: (e) => initCompare(e, {
    mode: "solo", up: "z", frame: "lego_gof16k", controls: $("#lego-ctl"), auto: 0.6, size: 2.3, camPos: [0, 1.2, 5.6], controlsLabel: "Pick an engine",
    items: [
      { id: "lego_pgsr", short: "PGSR" }, { id: "lego_2dgs_gated", short: "2DGS" }, { id: "lego_gof16k", short: "GOF" }, { id: "lego_neus2", short: "NeuS2" },
      { id: "lego_gw", short: "Wrapping" }, { id: "lego_sugar", short: "SuGaR" }, { id: "lego_topo", short: "TopoSurfel" }, { id: "lego_2dgs_raw", short: "2DGS raw" },
    ],
  }),
  gate: (e) => initCompare(e, {
    mode: "solo", up: "z", frame: "lego_gof16k", controls: $("#gate-ctl"), auto: 0.5, size: 1.5, camPos: [0, 1.4, 6.2], controlsLabel: "Before / after",
    items: [
      { id: "lego_2dgs_raw", short: "Lego · before", label: "Lego · raw TSDF, IoU 0.498" },
      { id: "lego_2dgs_gated", short: "Lego · after", label: "Lego · gated, IoU 0.975" },
      { id: "boot_2dgs_unmasked", short: "Boot · before", label: "Boot · raw TSDF, F 0.089", frame: "boot_gt", up: "-y", size: 1.6 },
      { id: "boot_2dgs_gated", short: "Boot · after", label: "Boot · gated, F 0.902", frame: "boot_gt", up: "-y", size: 1.6 },
    ],
    onShow: (it) => { const t = $("#gate-label"); if (t) t.textContent = it.label; },
  }),
  gen: (e) => initCompare(e, {
    mode: "solo", up: "y", controls: $("#gen-ctl"), size: 2.0, auto: 0.5, controlsLabel: "Generated · scan",
    items: [
      { id: "gen_bear_uniforge", short: "Bear · generated", label: "UniForge3D · bear · generated from 4 photos" },
      { id: "bear_gt", short: "Bear · scan", label: "Bear · laser scan (reference, own scale)", up: "z", spectrum: 0, tint: 0xd8d2c4, frame: "bear_gt" },
      { id: "gen_buddha_uniforge", short: "Buddha · generated", label: "UniForge3D · buddha · generated from 4 photos", frame: "gen_buddha_uniforge" },
      { id: "buddha_gt", short: "Buddha · scan", label: "Buddha · laser scan (reference, own scale)", up: "z", spectrum: 0, tint: 0xd8d2c4, frame: "buddha_gt" },
      { id: "gen_case01_uniforge", short: "Example", label: "UniForge3D · official example figurine", frame: "gen_case01_uniforge" },
    ].map((it) => ({ frame: it.id, ...it })),
    onShow: (it) => { const t = $("#gen-label"); if (t) t.textContent = it.label; },
  }),
  buddha: (e) => initCompare(e, {
    ref: "buddha_gt", up: "z", controls: $("#buddha-ctl"), size: 2.1, auto: 0.5, controlsLabel: "Compare with scan",
    items: R.buddha.rows.map((r) => ({ id: r.mesh, short: r.m.split(" · ")[0].replace("Six photos → ", "").replace(" 15k", "").replace(" 10k", "") + (r.kind === "derived" ? " · cleaned" : r.m.includes("Open-RNb") ? " · raw" : ""), label: `${r.m} · F ${r.F.toFixed(3)}` })),
    onShow: (it) => { const t = $("#buddha-label"); if (t) t.textContent = it.label; },
  }),
};
const started = new WeakSet();
function startWell(e) {
  if (started.has(e)) return;
  started.add(e);
  const f = wells[e.dataset.well];
  window.__stages = window.__stages || {};
  f && f(e).then((r) => (window.__stages[e.dataset.well] = r)).catch((err) => { console.error(err); const l = e.querySelector(".loading"); if (l) l.textContent = "3D unavailable"; });
}
const wellObs = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && startWell(x.target)), { rootMargin: "50% 0px" });
const NOGL = new URLSearchParams(location.search).has("nogl");
if (!NOGL) $$("[data-well]").forEach((e) => (PRINT ? startWell(e) : wellObs.observe(e)));
else $$(".well .loading").forEach((l) => l.remove());

// 2D interactives
$$("canvas[data-sphere]").forEach((c) => initSphere(c, $(c.dataset.sphere)));
$$("[data-decoder]").forEach((w) => initDecoder(w));
$$("[data-timeline]").forEach((h) => drawTimeline(h));
initInteract();

// ------------------------------------------------------------ reveal on scroll
const revealObs = new IntersectionObserver((es) => es.forEach((x) => {
  if (!x.isIntersecting) return;
  const t = x.target;
  t.classList.add("is-in");
  if (t.matches(".plate")) {
    $$("[data-reveal], [data-split], .draw", t).forEach((c) => c.classList.add("is-in"));
    $$("[data-to]", t).forEach(countUp);
    fillBars(t);
  }
  revealObs.unobserve(t);
}), { threshold: 0.22 });
$$(".plate").forEach((p) => revealObs.observe(p));

// ------------------------------------------------------------ side index + progress
const index = $(".index"), plates = $$(".plate[data-title]");
if (index) {
  index.innerHTML = plates.map((p, i) => `<a href="#${p.id}"><span>${String(i).padStart(2, "0")} · ${p.dataset.title}</span><i></i></a>`).join("");
  const links = $$("a", index);
  const mark = () => {
    const mid = innerHeight * 0.5;
    const cur = plates.find((p) => { const r = p.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
    links.forEach((a) => a.classList.toggle("on", !!cur && a.getAttribute("href") === "#" + cur.id));
  };
  addEventListener("scroll", mark, { passive: true }); mark();
}
const prog = $(".progress");
addEventListener("scroll", () => { if (prog) prog.style.width = (scrollY / (document.documentElement.scrollHeight - innerHeight)) * 100 + "%"; }, { passive: true });

// keyboard: ←/→ or PgUp/PgDn step plate to plate (presenting)
addEventListener("keydown", (e) => {
  if (!["ArrowRight", "ArrowLeft", "PageDown", "PageUp"].includes(e.key) || e.target.closest("input,button")) return;
  e.preventDefault();
  const dir = e.key === "ArrowRight" || e.key === "PageDown" ? 1 : -1;
  const cur = plates.findIndex((p) => p.getBoundingClientRect().top > -innerHeight * 0.4);
  const nx = plates[Math.max(0, Math.min(plates.length - 1, cur + (dir > 0 ? (plates[cur].getBoundingClientRect().top < 4 ? 1 : 0) : -1)))];
  nx?.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ------------------------------------------------------------ print / PDF readiness
function finalize() {
  $$("[data-reveal], [data-split], .draw, .plate").forEach((c) => c.classList.add("is-in"));
  $$("[data-to]").forEach((e) => (e.textContent = parseFloat(e.dataset.to).toFixed((String(e.dataset.to).split(".")[1] || "").length)));
  $$(".fill").forEach((f) => (f.style.width = f.dataset.w + "%"));
}
addEventListener("beforeprint", finalize);
if (PRINT) {
  document.documentElement.classList.add("is-print");
  finalize();
  // signal for the exporter once fonts + meshes have had time to settle
  document.fonts.ready.then(() => setTimeout(() => (document.title += " ✓"), 9000));
}
