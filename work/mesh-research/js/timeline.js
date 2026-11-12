// The run log: a fixed 24-hour snapshot of the FIRST round, 18:00 Oct 7 to 18:00 Oct 8 PDT, when the agent swarm
// was released on the problem. Drawn from coordination/gpu_runner.jsonl and run-folder activity (via data/timeline.js);
// later work is cut off here on purpose (the "Latest passes" plate shows it live).
// Top track: the ONE shared GPU. Every block is a real job, serialized by a Windows mutex.
// Lanes below: run-folder activity spans, packed into sub-rows per research lane.
const NS = "http://www.w3.org/2000/svg";
const LANES = [
  { id: "light", name: "Light", sub: "normal estimation" },
  { id: "surface", name: "Surface", sub: "normal integration" },
  { id: "views", name: "Views", sub: "splats & neural SDF" },
  { id: "cameras", name: "Cameras", sub: "pose recovery" },
];
const COL = { light: "var(--lane-light)", surface: "var(--lane-surface)", views: "var(--lane-views)", cameras: "var(--lane-cameras)", gen: "var(--lane-gen)", infra: "var(--bone-3)" };
const TZ = -7; // PDT
// Key moments (UTC), taken from output-file times in the research tree
const FLAGS = [
  { t: "2026-10-08T01:17:26Z", text: "first bear mesh" },
  { t: "2026-10-08T04:26:07Z", text: "SuperNormal · F 0.912" },
  { t: "2026-10-08T06:34:54Z", text: "2DGS gate · IoU 0.975" },
  { t: "2026-10-08T08:26:32Z", text: "six-photo bridge · F 0.863" },
  { t: "2026-10-08T09:28:46Z", text: "audit finds centring bug" },
  { t: "2026-10-08T13:02:00Z", text: "fixed-lens cameras · 2.98%" },
];
// the snapshot window (UTC): 18:00 PDT Oct 7 -> 18:00 PDT Oct 8
const WIN0 = "2026-10-08T01:00:00Z", WIN1 = "2026-10-09T01:00:00Z";
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
}
const fmt = (d) => {
  const h = (d.getUTCHours() + 24 + TZ) % 24;
  return String(h).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
};

export function drawTimeline(host) {
  const N = window.NIGHT;
  if (!N) return;
  const W = 1440, H = 510, L = 150, R = 20, TOP = 44;
  const t0 = new Date(WIN0).getTime(), t1 = new Date(WIN1).getTime();
  const ms = (v) => new Date(v).getTime();
  const inWin = (a, b) => ms(b) > t0 && ms(a) < t1;
  const clip = (v) => Math.min(Math.max(ms(v), t0), t1);
  const jobs = N.jobs.filter((j) => inWin(j.start, j.end));
  const runsAll = N.runs.filter((r) => inWin(r.start, r.end) && ms(r.start) < t1 && ms(r.start) >= t0 - 3600e3);
  const reports = N.milestones.filter((m) => ms(m.at) >= t0 && ms(m.at) <= t1);
  const x = (t) => L + ((clip(t) - t0) / (t1 - t0)) * (W - L - R);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "dia timeline draw", role: "img", "aria-label": "First 24 hours of the agent swarm: GPU jobs and run activity by lane" });

  // hour grid
  for (let t = t0 + 3600e3; t < t1; t += 3600e3) {
    const xx = x(t);
    el("line", { x1: xx, x2: xx, y1: TOP + 26, y2: H - 30, stroke: "var(--rule)", "stroke-width": 1 }, svg);
    const h = (new Date(t).getUTCHours() + 24 + TZ) % 24;
    const lab = el("text", { x: xx, y: TOP + 16, "text-anchor": "middle", "font-size": 11, fill: h >= 19 || h < 6 ? "var(--sodium)" : "var(--bone-3)" }, svg);
    lab.textContent = String(h).padStart(2, "0") + ":00";
  }
  // midnight marker
  const mid = new Date("2026-10-08T07:00:00Z"); // 00:00 PDT Oct 8
  {
    const mx = x(mid);
    el("line", { x1: mx, x2: mx, y1: TOP + 22, y2: H - 22, stroke: "var(--sodium)", "stroke-width": 1, "stroke-dasharray": "2 4", opacity: 0.7 }, svg);
    var midLabel = el("text", { x: mx + 6, y: H - 12, "font-size": 11, fill: "var(--sodium)" }, svg); midLabel.textContent = "MIDNIGHT · OCT 8";
  }

  // GPU track
  let y = TOP + 40;
  const gy = y;
  el("text", { x: 0, y: gy + 14, "font-size": 12, fill: "var(--bone)" }, svg).textContent = "SHARED GPU";
  el("text", { x: 0, y: gy + 30, "font-size": 10, fill: "var(--bone-3)" }, svg).textContent = "RTX 4090 · 1 mutex";
  el("rect", { x: L, y: gy, width: W - L - R, height: 34, fill: "rgba(236,231,220,0.03)", stroke: "var(--rule)" }, svg);
  const firstJob = jobs.length ? Math.min(...jobs.map((j) => ms(j.start))) : t1;
  // before the mutex existed GPU work used per-run launchers; mark that period honestly
  el("rect", { x: L, y: gy, width: Math.max(x(firstJob) - L, 0), height: 34, fill: "url(#hatch)" }, svg);
  const defs = el("defs", {}, svg);
  const pat = el("pattern", { id: "hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "rgba(236,231,220,0.12)", "stroke-width": 1 }, pat);
  const pre = el("text", { x: L + 8, y: gy + 21, "font-size": 10, fill: "var(--bone-3)" }, svg);
  pre.textContent = "GPU runs via per-run launchers (before the shared mutex)";
  if (x(firstJob) - L < 360) pre.remove();
  for (const j of jobs) {
    const a = x(j.start), b = Math.max(x(j.end), a + 1.2);
    const r = el("rect", { x: a, y: gy + 3, width: b - a, height: 28, fill: COL[j.lane] || COL.infra, opacity: j.exit === 0 ? 0.92 : 0.35 }, svg);
    el("title", {}, r).textContent = `${j.owner} · ${j.method}\n${fmt(new Date(j.start))}–${fmt(new Date(j.end))} PDT · ${Math.round(j.sec)} s · exit ${j.exit}`;
  }
  // idle stretches on the GPU (> 45 min with no mutex job), labelled plainly
  const js = jobs.map((j) => [new Date(j.start).getTime(), new Date(j.end).getTime()]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < js.length; i++) {
    const gap = js[i][0] - js[i - 1][1];
    if (gap > 45 * 60e3) {
      const a = x(js[i - 1][1]), b = x(js[i][0]);
      const t = el("text", { x: (a + b) / 2, y: gy + 21, "text-anchor": "middle", "font-size": 10, fill: "var(--bone-3)" }, svg);
      t.textContent = `GPU idle · ${Math.round(gap / 60e3)} min`;
    }
  }
  // milestone flags above the GPU track
  const ends = [-1e9, -1e9, -1e9];
  for (const f of FLAGS) {
    const fx = x(f.t);
    if (fx < L || fx > W - R) continue;
    const label = `${fmt(new Date(f.t))} ${f.text}`, w = label.length * 6.4 + 10;
    const right = fx + w > W - R;
    const x0 = right ? fx - w : fx, x1 = right ? fx : fx + w;
    let lvl = ends.findIndex((e) => x0 > e + 6); if (lvl < 0) lvl = 2;
    ends[lvl] = x1;
    const ty = 2 + lvl * 13;
    el("line", { x1: fx, x2: fx, y1: ty + 4, y2: gy + 34, stroke: "var(--sodium)", "stroke-width": 1, opacity: 0.6 }, svg);
    el("circle", { cx: fx, cy: ty + 4, r: 2.5, fill: "var(--sodium)" }, svg);
    const lab = el("text", { x: right ? fx - 6 : fx + 6, y: ty + 8, "font-size": 10.5, fill: "var(--sodium)", "text-anchor": right ? "end" : "start" }, svg);
    lab.textContent = label;
  }
  y = gy + 56;

  // lanes with packed run spans
  for (const lane of LANES) {
    const runs = runsAll.filter((r) => r.lane === lane.id).sort((a, b) => a.start.localeCompare(b.start));
    const rows = [];
    for (const r of runs) {
      const a = x(r.start), b = Math.max(x(r.end), a + 3);
      let i = rows.findIndex((end) => end < a - 4);
      if (i < 0) { i = rows.length; rows.push(b); } else rows[i] = b;
      r._row = i; r._a = a; r._b = b;
    }
    const nrows = Math.max(rows.length, 1);
    const rh = Math.min(9, 76 / nrows);
    const laneH = Math.max(nrows * rh, 40) + 18;
    el("text", { x: 0, y: y + 13, "font-size": 12, fill: COL[lane.id] }, svg).textContent = lane.name.toUpperCase();
    el("text", { x: 0, y: y + 28, "font-size": 10, fill: "var(--bone-3)" }, svg).textContent = lane.sub;
    el("line", { x1: L, x2: W - R, y1: y + laneH - 6, y2: y + laneH - 6, stroke: "var(--rule)" }, svg);
    for (const r of runs) {
      const yy = y + 4 + r._row * rh;
      const ln = el("line", { x1: r._a, x2: r._b, y1: yy, y2: yy, stroke: COL[lane.id], "stroke-width": Math.max(rh - 3, 1.5), "stroke-linecap": "round", opacity: 0.8, style: `--len:${Math.ceil(r._b - r._a + 2)}` }, svg);
      el("title", {}, ln).textContent = `${r.run}\n${fmt(new Date(r.start))}–${fmt(new Date(r.end))} PDT · ${r.files} files`;
    }
    const cnt = el("text", { x: 0, y: y + 42, "font-size": 10, fill: "var(--bone-4)" }, svg);
    cnt.textContent = `${runs.length} run folders`;
    y += laneH;
  }

  // milestones (report publications)
  y += 6;
  el("text", { x: 0, y: y + 10, "font-size": 12, fill: "var(--bone)" }, svg).textContent = "REPORTS";
  for (const m of reports) {
    const xx = x(m.at);
    const d = el("path", { d: `M${xx} ${y + 2} l5 5 l-5 5 l-5 -5 z`, fill: "var(--bone)", opacity: 0.85 }, svg);
    el("title", {}, d).textContent = `${fmt(new Date(m.at))} PDT · ${m.title || m.file}`;
  }
  midLabel.setAttribute("y", y + 34); // below the report diamonds
  // window totals for the plate copy ([data-tl] spans)
  const tl = { jobs: jobs.length, runs: runsAll.length, reports: reports.length, owners: new Set(jobs.map((j) => j.owner)).size, gpuh: (jobs.reduce((s, j) => s + (Math.min(ms(j.end), t1) - Math.max(ms(j.start), t0)), 0) / 3600e3).toFixed(1) };
  host.closest(".plate")?.querySelectorAll("[data-tl]").forEach((e) => { if (tl[e.dataset.tl] !== undefined) e.textContent = tl[e.dataset.tl]; });
  svg.setAttribute("viewBox", `0 0 ${W} ${Math.max(y + 40, 300)}`);
  host.appendChild(svg);
}
