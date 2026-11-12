// NOCTURNE interaction layer: makes every interactive thing *look* interactive.
//  1. "Interactive" tag in the running head of any plate you can play with
//  2. hint cards on 3D wells (drag / wipe / switch) that retire after first use
//  3. one custom tooltip for [data-tip] and SVG <title> (timeline, charts, pipeline stages)
//  4. glossary terms: first mention of a metric/technique per plate gets a dotted underline + definition
//  5. linking: click [data-show="well:meshId"] → that 3D well loads the mesh; linked items light up
//  6. keyboard: ←/→ plates (main.js), 1–9 pick a mesh, [ ] step meshes, ? opens the guide
//  7. the guide overlay + a one-time welcome toast
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const TERMS = {
  "F-score": "Share of the reconstruction near the scan (precision) and of the scan covered (recall), combined. Higher is better.",
  "Chamfer": "Average distance between the two surfaces, measured both ways. Lower is better; punishes floating fragments.",
  "IoU": "Intersection over union of the rendered outline and the real mask, on views never used in training. Outline only.",
  "Sampson": "Epipolar (Sampson) error: pixel distance from a matched point to the line the predicted cameras say it must lie on. Under 8 px passes.",
  "epipolar": "Two cameras constrain a matched point to lie on a line in the other image. Distance from that line measures camera agreement.",
  "normal map": "An image whose RGB channels store the surface direction (x, y, z) at each pixel.",
  "surface normal": "The direction a surface faces at a point: the quantity photometric stereo recovers.",
  "photometric stereo": "Recovering surface orientation from several photos taken from one viewpoint under different lights.",
  "OLAT": "One light at a time: a photo set where each image is lit by a single lamp.",
  "TSDF": "Truncated signed distance fusion: depth maps are merged into a volume, then a surface is extracted from it.",
  "marching cubes": "Standard algorithm that turns a sampled distance field into a triangle mesh.",
  "marching tetrahedra": "Like marching cubes, on a tetrahedral grid; GOF uses it to extract a surface from Gaussians.",
  "Poisson": "Poisson surface reconstruction: fits a watertight surface to oriented points.",
  "structure-from-motion": "Classic photogrammetry: match features across photos, then solve cameras and 3D points together.",
  "COLMAP": "The standard open-source structure-from-motion / photogrammetry pipeline.",
  "PnP": "Perspective-n-Point: solve a camera's pose from known 3D points and their pixels, here with the measured lens.",
  "largest component": "A derived mesh keeping only the biggest connected piece, chosen by face count alone; reported beside the raw result.",
  "cross-polarized": "Polarizing filters on lights and lens remove specular glare, leaving diffuse colour.",
  "watertight": "A closed mesh with no holes or open boundary edges.",
};

export function initInteract() {
  const PRINT = new URLSearchParams(location.search).has("print");

  // ---------------------------------------------------------------- tooltip
  const tip = document.createElement("div");
  tip.className = "tip screen-only";
  tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);
  // move SVG <title> text into data-tip so one styled tooltip handles everything
  const adoptTitles = (root = document) => $$("svg title", root).forEach((t) => { t.parentElement?.setAttribute("data-tip", t.textContent); t.remove(); });
  adoptTitles();
  let tipEl = null;
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest?.("[data-tip]");
    if (!t || t === tipEl) return;
    tipEl = t;
    tip.innerHTML = t.dataset.tip.replace(/\n/g, "<br>");
    tip.classList.add("on");
  });
  document.addEventListener("pointermove", (e) => {
    if (!tipEl) return;
    if (!tipEl.contains(e.target)) { tipEl = null; tip.classList.remove("on"); return; }
    const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > innerHeight - 8) y = e.clientY - h - pad;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  });
  document.addEventListener("scroll", () => { tipEl = null; tip.classList.remove("on"); }, { passive: true });

  // ---------------------------------------------------------------- glossary terms (first mention per plate)
  const keys = Object.keys(TERMS).sort((a, b) => b.length - a.length);
  const rx = new RegExp(`\\b(${keys.map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|")})\\b`, "i");
  $$(".plate").forEach((plate) => {
    const seen = new Set();
    $$(".body, .small, .cap, .caveat span, dd, .clues span", plate).forEach((blk) => {
      if (blk.closest(".term, .seg, .ctl, svg, .bars, .kv")) return;
      const walker = document.createTreeWalker(blk, NodeFilter.SHOW_TEXT);
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const n of nodes) {
        const m = n.nodeValue.match(rx);
        if (!m) continue;
        const key = keys.find((k) => k.toLowerCase() === m[1].toLowerCase());
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const after = n.splitText(m.index);
        after.nodeValue = after.nodeValue.slice(m[1].length);
        const span = document.createElement("span");
        span.className = "term";
        span.dataset.tip = `<b>${key}</b><br>${TERMS[key]}`;
        span.textContent = m[1];
        n.parentNode.insertBefore(span, after);
      }
    });
  });

  // ---------------------------------------------------------------- "Interactive" tags in running heads
  $$(".plate").forEach((p) => {
    const kinds = [];
    if ($(".well", p)) kinds.push("3D");
    if ($(".ctl, .seg, [data-show]", p)) kinds.push("switch");
    if ($("canvas[data-sphere], [data-decoder]", p)) kinds.push("hover");
    if ($("[data-timeline], [data-slope], .pstage[data-tip], .bar[data-tip], .scorecard a, .toc a", p)) kinds.push("explore");
    if (!kinds.length) return;
    const head = $(".plate__head", p);
    const chip = document.createElement("span");
    chip.className = "ia-chip screen-only";
    chip.innerHTML = `<i class="ia-dot"></i>Interactive`;
    chip.dataset.tip = "This plate responds to you: " + [...new Set(kinds)].map((k) => ({ "3D": "drag the 3D view", switch: "switch what's shown", hover: "move the pointer over it", explore: "hover marks for details" }[k])).join(" · ");
    (head.lastElementChild || head).prepend(chip);
  });

  // ---------------------------------------------------------------- hint cards on 3D wells
  $$(".well[data-well]").forEach((w) => {
    if (w.dataset.well === "hero") return;
    const wipe = ["bridge", "buddha"].includes(w.dataset.well);
    const card = document.createElement("div");
    card.className = "hint-card screen-only";
    card.innerHTML = `
      <span class="hc-item"><svg viewBox="0 0 24 24" class="hc-ico orbit"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M18 2.5v4.2h-4.2M6 21.5v-4.2h4.2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>Drag to orbit</span>
      ${wipe ? `<span class="hc-item"><svg viewBox="0 0 24 24" class="hc-ico"><path d="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>Drag the handle to wipe</span>` : ""}
      <span class="hc-item"><svg viewBox="0 0 24 24" class="hc-ico"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M5 19l2-2" stroke="currentColor" stroke-width="1.4"/></svg>Move to relight</span>`;
    w.appendChild(card);
    $$(".tag.hint", w).forEach((h) => h.remove());
  });

  // ---------------------------------------------------------------- linking: [data-show="well:id"]
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-show]");
    if (!t) return;
    const [well, id] = t.dataset.show.split(":");
    const st = window.__stages?.[well];
    if (st?.show) {
      st.show(id);
      const wellEl = $(`.well[data-well="${well}"]`);
      wellEl?.classList.add("pinged");
      setTimeout(() => wellEl?.classList.remove("pinged"), 700);
    }
  });
  document.addEventListener("deck:show", (e) => {
    const { well, id } = e.detail;
    $$(`[data-show^="${well}:"]`).forEach((x) => x.classList.toggle("is-active", x.dataset.show === `${well}:${id}`));
  });
  $$("[data-show]").forEach((x) => { x.setAttribute("role", "button"); x.tabIndex = 0; });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches?.("[data-show]")) e.target.click(); });

  // ---------------------------------------------------------------- keyboard: 1–9, [ ]
  const currentPlate = () => { const mid = innerHeight / 2; return $$(".plate").find((p) => { const r = p.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }); };
  document.addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea")) return;
    if (e.key === "?" || (e.key === "/" && e.shiftKey)) { toggleGuide(); return; }
    if (e.key === "Escape") { toggleGuide(false); return; }
    const p = currentPlate(); if (!p) return;
    const w = $(".well[data-well]", p); const st = w && window.__stages?.[w.dataset.well];
    if (!st?.items) return;
    if (/^[1-9]$/.test(e.key)) { const it = st.items[+e.key - 1]; if (it) { st.show(it.id); $(".ctl", p)?.classList.remove("attn"); } }
    if (e.key === "]") st.step(1);
    if (e.key === "[") st.step(-1);
  });

  // ---------------------------------------------------------------- guide overlay + welcome toast
  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "guide-fab screen-only";
  fab.innerHTML = `<span>?</span><em>How to use</em>`;
  fab.setAttribute("aria-label", "How to use this report");
  document.body.appendChild(fab);
  const guide = document.createElement("div");
  guide.className = "guide screen-only";
  guide.innerHTML = `
    <div class="guide-card" role="dialog" aria-label="How to use this report">
      <div class="eyebrow no-rule">Interactive report</div>
      <h3 class="h2">How to <em>explore it.</em></h3>
      <ul class="guide-list">
        <li><i class="g-ico"><span class="ia-dot"></span></i><b>Interactive tag</b><span>Plates marked <span class="ia-chip demo"><i class="ia-dot"></i>Interactive</span> in the top bar respond to you.</span></li>
        <li><i class="g-ico">⟲</i><b>3D views</b><span>Drag to orbit any mesh. Move the pointer to move the light.</span></li>
        <li><i class="g-ico">⟷</i><b>Wipe</b><span>Drag the white handle to compare our reconstruction (colour) with the laser scan (bone).</span></li>
        <li><i class="g-ico">‹ ›</i><b>Switch meshes</b><span>Use the stepper under a 3D view, keys <kbd>1</kbd>–<kbd>9</kbd>, or <kbd>[</kbd> <kbd>]</kbd>.</span></li>
        <li><i class="g-ico">◉</i><b>Linked bars &amp; rows</b><span>Bars and table rows marked ◉ load that mesh into the 3D view.</span></li>
        <li><i class="g-ico">···</i><b>Terms &amp; charts</b><span>Dotted words explain themselves; hover chart marks and timeline bars for detail.</span></li>
        <li><i class="g-ico">→</i><b>Navigate</b><span><kbd>←</kbd> <kbd>→</kbd> or <kbd>PgUp</kbd> <kbd>PgDn</kbd> step plates. The index on the right jumps anywhere. <kbd>?</kbd> opens this guide.</span></li>
      </ul>
      <button type="button" class="guide-close">Start exploring</button>
    </div>`;
  document.body.appendChild(guide);
  function toggleGuide(force) {
    const on = force ?? !guide.classList.contains("on");
    guide.classList.toggle("on", on);
    if (on) $(".guide-close", guide).focus();
  }
  fab.onclick = () => toggleGuide(true);
  guide.addEventListener("click", (e) => { if (e.target === guide || e.target.closest(".guide-close")) toggleGuide(false); });

  if (!PRINT) {
    let seen = false;
    try { seen = localStorage.getItem("deck.guideSeen") === "1"; } catch {}
    if (!seen) {
      const toast = document.createElement("div");
      toast.className = "toast screen-only";
      toast.innerHTML = `<i class="ia-dot"></i><span>This report is interactive. Drag the 3D, switch meshes, hover for detail.</span><button type="button">Show me how</button><button type="button" class="x" aria-label="Dismiss">✕</button>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add("on"), 2200);
      const done = () => { toast.classList.remove("on"); try { localStorage.setItem("deck.guideSeen", "1"); } catch {} };
      toast.querySelector("button").onclick = () => { done(); toggleGuide(true); };
      toast.querySelector(".x").onclick = done;
      setTimeout(done, 14000);
    }
  }
  return { adoptTitles };
}
