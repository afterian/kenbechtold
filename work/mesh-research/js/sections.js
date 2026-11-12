// Data-driven sections: plate numbering, contents, scorecard, footwear bars,
// and the live "latest passes" tables.
// Everything reads window.RESULTS / window.NIGHT, so new results only need a data edit + rebuild.
const R = window.RESULTS, N = window.NIGHT;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TZ = -7;
const clock = (iso) => { const d = new Date(iso); return String((d.getUTCHours() + 24 + TZ) % 24).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0"); };
const day = (iso) => new Date(new Date(iso).getTime() + TZ * 3600e3).toISOString().slice(5, 10).replace("-", "/");

// ------------------------------------------------------------ plate numbers (so plates can be reordered)
const plates = $$(".plate");
plates.forEach((p, i) => $$("[data-pno]", p).forEach((e) => (e.textContent = String(i).padStart(2, "0"))));

// ------------------------------------------------------------ contents
const toc = $("#toc");
if (toc) {
  const ch = plates.filter((p) => p.dataset.chapter);
  toc.innerHTML = ch.map((p) => {
    const i = plates.indexOf(p);
    return `<li data-reveal><a href="#${p.id}"><span class="tn">${p.dataset.chapter}</span><span class="tt">${p.dataset.ctitle}</span><span class="tp">${String(i).padStart(2, "0")}</span></a><p class="cap">${p.dataset.cdesc || ""}</p></li>`;
  }).join("") + `<li data-reveal><a href="#p-atlas"><span class="tn">A–B</span><span class="tt">Appendix</span><span class="tp">${String(plates.indexOf($("#p-atlas"))).padStart(2, "0")}</span></a><p class="cap">Method atlas and how each metric works.</p></li>`;
}

// ------------------------------------------------------------ scorecard
const sc = $("#scorecard");
if (sc && R.scorecard) {
  const cell = (c, lane) => c.go
    ? `<a class="sc-cell s-${c.s}" href="#${c.go}" data-tip="Jump to the evidence"><span class="sc-go">SEE ${String([...document.querySelectorAll(".plate")].indexOf(document.getElementById(c.go))).padStart(2, "0")} →</span><span class="sc-v ${c.s === "good" ? "spectrum-text" : ""}">${c.v}</span><span class="sc-m">${c.m}</span></a>`
    : `<div class="sc-cell s-${c.s}"><span class="sc-v ${c.s === "good" ? "spectrum-text" : ""}">${c.v}</span><span class="sc-m">${c.m}</span></div>`;
  sc.innerHTML = `
    <div class="sc-head"><span></span><span class="lane-light">A · Photometric stereo</span><span class="lane-views">B · Gaussians</span><span class="lane-cameras">C · Cameras</span></div>
    ${R.scorecard.map((r) => `<div class="sc-row" data-reveal><div class="sc-obj"><b>${r.object}</b><span>${r.sub}</span></div>${cell(r.light, "light")}${cell(r.views, "views")}${cell(r.cams, "cameras")}</div>`).join("")}
    <div class="sc-key"><span><i class="k-good"></i>strong result</span><span><i class="k-bad"></i>weak / failed</span><span><i class="k-open"></i>in progress</span><span><i class="k-na"></i>not applicable</span></div>`;
}

// ------------------------------------------------------------ results bars coloured by road, linked to a 3D well
function roadBars(host, rows, well) {
  if (!host) return;
  const best = Math.max(...rows.map((r) => r.F));
  host.innerHTML = rows.map((r) => `
    <div class="bar road-${r.lane} ${r.F === best ? "hi" : ""} ${r.F < 0.2 ? "lo" : ""}" ${r.mesh ? `data-show="${well}:${r.mesh}" data-tip="Load <b>${r.m}</b> into the 3D view<br>F ${r.F.toFixed(3)} · Chamfer ${r.CD}${r.iou ? ` · outline IoU ${r.iou.toFixed(3)}` : ""}"` : `data-tip="${r.m}: no display mesh staged"`}>
      <div class="name">${r.m}${r.kind === "derived" ? "<small>derived</small>" : ""}</div>
      <div class="track"><div class="fill" data-w="${r.F * 100}"></div></div>
      <div class="val">${r.F.toFixed(3)}</div>
    </div>`).join("");
}
roadBars($("#buddha-bars"), R.buddha.rows, "buddha");

// ------------------------------------------------------------ latest passes (live)
if (N) {
  const snap = new Date(N.stats.snapshot_utc).getTime();
  const runsT = $("#inflight-runs");
  if (runsT) {
    // newest passes = run folders by first-file time (later catalog touch-ups don't make an old run "new")
    const recent = [...N.runs].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 10);
    runsT.innerHTML = `<thead><tr><th>New run folder</th><th>Lane</th><th style="text-align:right">Started</th><th style="text-align:right">Last write</th></tr></thead><tbody>` +
      recent.map((r) => { const live = (snap - new Date(r.end).getTime()) / 60e3 < 30; return `<tr class="${live ? "hi" : ""}"><td class="mono rf">${r.method}/${r.scene}/<b>${r.run.split("/").pop()}</b></td><td><span class="chip lane-${r.lane}">${r.lane}</span></td><td class="n">${day(r.start)} ${clock(r.start)}</td><td class="n">${live ? '<span class="t-sodium">● </span>' : ""}${clock(r.end)}</td></tr>`; }).join("") + "</tbody>";
  }
  const jobsT = $("#inflight-jobs");
  if (jobsT) {
    const recent = [...N.jobs].sort((a, b) => b.end.localeCompare(a.end)).slice(0, 10);
    jobsT.innerHTML = `<thead><tr><th>Owner · method</th><th style="text-align:right">Time</th><th style="text-align:right">Exit</th></tr></thead><tbody>` +
      recent.map((j) => `<tr><td><span class="mono" style="color:var(--lane-${j.lane})">${j.owner}</span><br><span class="cap">${j.method}</span></td><td class="n">${clock(j.end)}<br><span class="cap">${j.sec >= 60 ? Math.round(j.sec / 60) + " min" : Math.round(j.sec) + " s"}</span></td><td class="n ${j.exit === 0 ? "good" : "bad"}">${j.exit}</td></tr>`).join("") + "</tbody>";
  }
}
