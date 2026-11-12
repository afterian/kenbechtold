// 3D comparison wells.
// Visual rule used across the deck: the SCANNED REFERENCE is always bone-coloured clay,
// a RECONSTRUCTION is always spectrum (coloured by its own surface normals).
// Modes:
//   wipe   — a screen-space vertical plane splits reconstruction (left) from scan (right); drag to move it
//   ghost  — scan solid, reconstruction translucent around it (scale errors)
//   solo   — one mesh at a time
// Interaction contract (see js/interact.js):
//   - a stepper control (‹ options › n/N) is built into cfg.controls
//   - anything with data-show="<well>:<meshId>" selects that mesh when clicked
//   - every selection dispatches `deck:show` {well, id} so linked bars/rows can highlight
import { THREE, Stage, frameFrom, loadMesh } from "./stage.js";

export async function initCompare(el, cfg) {
  // Each mesh sits in its own group carrying its dataset's up-axis, so one viewer can mix
  // objects from differently oriented datasets (Lego z-up, Skoltech3D y-down).
  const st = new Stage(el, { up: null, auto: cfg.auto ?? 0.5, camPos: cfg.camPos ?? [0, 0.3, 6.0], fov: cfg.fov ?? 26, zoom: cfg.zoom });
  if (cfg.polar !== false) { st.controls.minPolarAngle = Math.PI * 0.18; st.controls.maxPolarAngle = Math.PI * 0.7; }
  const well = el.dataset.well;
  const size = cfg.size ?? 2.1;
  const baseFrame = frameFrom(cfg.frame ?? cfg.ref ?? cfg.items[0].id, size);
  const UP = { z: [-Math.PI / 2, 0, 0], "-y": [Math.PI, 0, 0], y: [0, 0, 0] };
  const itemFrame = (it) => (it.frame ? frameFrom(it.frame, it.size ?? size) : baseFrame);

  // Animated framing: when cfg.followFrame is set, the scan and the item share one transform that
  // eases between items' frames, so relative scale stays truthful while the view zooms.
  const cur = { c: baseFrame.center.clone(), s: baseFrame.scale }, tgt = { c: baseFrame.center.clone(), s: baseFrame.scale };
  const applyFrame = (m, c, s) => { m.scale.setScalar(s); m.position.copy(c).multiplyScalar(-s); };

  async function addWrapped(id, fr, mat, up) {
    const g = new THREE.Group();
    g.rotation.set(...(UP[up] ?? UP.y));
    st.root.add(g);
    const m = await st.addMesh(id, fr, mat);
    st.root.remove(m); g.add(m);
    m.userData.group = g;
    return m;
  }
  const mode = cfg.mode ?? "wipe";
  const planeL = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const planeR = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  let split = cfg.split ?? 0.0;
  const meshes = {};
  let ref = null;

  const loading = el.querySelector(".loading");
  if (cfg.ref) {
    ref = await addWrapped(cfg.ref, baseFrame, { spectrum: 0, tint: 0xd8d2c4 }, cfg.up ?? "z");
    if (mode === "wipe") ref.material.clippingPlanes = [planeR];
  }

  let current = null, buttons = [], counter = null, ctl = null;
  async function show(id) {
    const item = cfg.items.find((i) => i.id === id);
    if (!item) return;
    current = id;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
    if (counter) counter.textContent = `${cfg.items.indexOf(item) + 1} / ${cfg.items.length}`;
    if (!meshes[id]) {
      const m = await addWrapped(id, itemFrame(item), { opacity: mode === "ghost" ? (item.opacity ?? 0.42) : 1, spectrum: item.spectrum ?? 1, tint: item.tint }, item.up ?? cfg.up ?? "z");
      if (mode === "wipe" && cfg.ref) m.material.clippingPlanes = [planeL];
      meshes[id] = m;
    }
    if (current !== id) return; // a newer selection arrived while loading
    for (const [k, m] of Object.entries(meshes)) m.userData.group.visible = k === id;
    if (cfg.followFrame) { const f = itemFrame(item); tgt.c.copy(f.center); tgt.s = f.scale; }
    cfg.onShow?.(item);
    document.dispatchEvent(new CustomEvent("deck:show", { detail: { well, id } }));
    st.render();
  }
  await show(cfg.items[0].id);
  loading?.remove();
  (window.requestIdleCallback || setTimeout)(() => cfg.items.forEach((i) => loadMesh(i.id).catch(() => {})));

  if (cfg.followFrame) {
    st.onFrame.push(() => {
      cur.c.lerp(tgt.c, 0.07);
      cur.s += (tgt.s - cur.s) * 0.07;
      if (ref) applyFrame(ref, cur.c, cur.s);
      const m = meshes[current]; if (m) applyFrame(m, cur.c, cur.s);
    });
  }

  // wipe line + drag
  let line = null, touched = false;
  if (mode === "wipe" && cfg.ref) {
    line = document.createElement("div");
    line.className = "wipe-line";
    line.setAttribute("role", "slider");
    line.setAttribute("aria-label", "Drag to compare reconstruction and scan");
    line.innerHTML = '<span class="wl-l">Reconstruction</span><i></i><span class="wl-r">Scan</span><b class="wl-hint">drag</b>';
    el.appendChild(line);
    let drag = false;
    const setFromX = (clientX) => {
      const r = el.getBoundingClientRect();
      const ndc = ((clientX - r.left) / r.width) * 2 - 1;
      const dist = st.camera.position.length();
      const halfW = Math.tan(THREE.MathUtils.degToRad(st.camera.fov / 2)) * dist * st.camera.aspect;
      split = THREE.MathUtils.clamp(ndc * halfW, -1.6, 1.6);
    };
    line.addEventListener("pointerdown", (e) => { drag = true; touched = true; line.classList.add("touched"); el.classList.add("used"); st.controls.enabled = false; line.setPointerCapture(e.pointerId); });
    line.addEventListener("pointermove", (e) => drag && setFromX(e.clientX));
    line.addEventListener("pointerup", () => { drag = false; st.controls.enabled = true; });
    if (!cfg.split) st.onFrame.push((t) => { if (!touched) split = Math.sin(t * 0.45) * 0.55; });
  }
  const right = new THREE.Vector3();
  st.onFrame.push(() => {
    if (mode !== "wipe" || !cfg.ref) return;
    right.set(1, 0, 0).applyQuaternion(st.camera.quaternion);
    planeL.normal.copy(right).negate(); planeL.constant = split;
    planeR.normal.copy(right); planeR.constant = -split;
    if (line) {
      const p = right.clone().multiplyScalar(split).project(st.camera);
      line.style.left = ((p.x + 1) / 2) * 100 + "%";
    }
  });

  // stepper control: label · ‹ · options · › · n/N
  if (cfg.controls && cfg.items.length > 1) {
    ctl = document.createElement("div");
    ctl.className = "ctl attn";
    ctl.innerHTML = `<span class="ctl-label"><i class="ia-dot"></i>${cfg.controlsLabel ?? "Switch mesh"}</span>`;
    const step = (d) => {
      const i = cfg.items.findIndex((x) => x.id === current);
      show(cfg.items[(i + d + cfg.items.length) % cfg.items.length].id);
      ctl.classList.remove("attn");
    };
    const prev = Object.assign(document.createElement("button"), { type: "button", className: "ctl-step", innerHTML: "‹", title: "Previous" });
    const next = Object.assign(document.createElement("button"), { type: "button", className: "ctl-step", innerHTML: "›", title: "Next" });
    prev.onclick = () => step(-1); next.onclick = () => step(1);
    const seg = document.createElement("div");
    seg.className = "seg";
    cfg.items.forEach((it, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.id = it.id;
      b.innerHTML = `<span class="k">${i + 1}</span>${it.short ?? it.label}`;
      b.setAttribute("aria-pressed", String(it.id === current));
      b.onclick = () => { show(it.id); ctl.classList.remove("attn"); };
      seg.appendChild(b);
      buttons.push(b);
    });
    counter = document.createElement("span");
    counter.className = "ctl-count";
    counter.textContent = `1 / ${cfg.items.length}`;
    ctl.append(prev, seg, next, counter);
    cfg.controls.appendChild(ctl);
  }
  el.addEventListener("pointerdown", () => el.classList.add("used"));
  st.loop();
  // setSplit: pin the wipe (e.g. for thumbnails); large positive = all reconstruction
  const setSplit = (v) => { touched = true; split = v; line?.classList.add("touched"); };
  return { stage: st, show, setSplit, items: cfg.items, step: (d) => { const i = cfg.items.findIndex((x) => x.id === current); show(cfg.items[(i + d + cfg.items.length) % cfg.items.length].id); } };
}
