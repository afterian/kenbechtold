// NOCTURNE: shared Three.js stage.
// - loads display meshes from deck/assets/meshes (cached)
// - "spectrum" shader: colour = world-space surface normal (the normal-map look),
//   modulated by a movable light, so every render literally shows what the research measures
// - renders only while on screen, at a capped pixel ratio (the swarm is still using the GPU)
import * as THREE from "three";
import { PLYLoader } from "../vendor/three/PLYLoader.js";
import { OrbitControls } from "../vendor/three/OrbitControls.js";

export { THREE };
const loader = new PLYLoader();
// Registry so print/export can freeze every render loop (a PDF can't be taken while 7 WebGL loops spin).
const STAGES = new Set();
// Freezing also swaps each WebGL canvas for a still <img> of its current frame: print pipelines
// (and headless PDF export) handle images reliably, live WebGL canvases not always.
window.__freezeStages = (on = true) => {
  for (const s of STAGES) {
    s.frozen = on;
    const cv = s.renderer.domElement;
    if (on) {
      s.render();
      let img = s.el.querySelector("img.still");
      if (!img) { img = document.createElement("img"); img.className = "still"; img.alt = ""; s.el.insertBefore(img, cv); }
      img.src = cv.toDataURL("image/png");
      cv.style.visibility = "hidden";
    } else {
      s.el.querySelector("img.still")?.remove();
      cv.style.visibility = "";
      s.loop();
    }
  }
  return STAGES.size;
};
addEventListener("beforeprint", () => window.__freezeStages(true));
addEventListener("afterprint", () => window.__freezeStages(false));
const cache = new Map();

export function loadMesh(id) {
  if (cache.has(id)) return cache.get(id);
  const meta = (window.MESHES || {})[id];
  if (!meta) return Promise.reject(new Error("unknown mesh " + id));
  const p = new Promise((res, rej) =>
    loader.load(meta.file, (g) => { g.computeVertexNormals(); g.computeBoundingBox(); res(g); }, undefined, rej)
  );
  cache.set(id, p);
  return p;
}

/** frame = {center:Vector3, scale:number} computed from a reference bbox so paired meshes stay registered */
export function frameFrom(id, size = 2) {
  const m = window.MESHES[id];
  const lo = new THREE.Vector3(...m.bbox_min), hi = new THREE.Vector3(...m.bbox_max);
  const c = lo.clone().add(hi).multiplyScalar(0.5);
  const ext = hi.clone().sub(lo);
  return { center: c, scale: size / Math.max(ext.x, ext.y, ext.z), ext };
}

const VERT = /* glsl */ `
  varying vec3 vN; varying vec3 vW; varying vec3 vObjN;
  #include <clipping_planes_pars_vertex>
  void main(){
    vec4 w = modelMatrix * vec4(position,1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vObjN = normal;
    vec4 mvPosition = viewMatrix * w;
    gl_Position = projectionMatrix * mvPosition;
    #include <clipping_planes_vertex>
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uLight; uniform float uMix; uniform float uOpacity; uniform vec3 uTint; uniform float uSpectrum;
  uniform vec3 uCam;
  varying vec3 vN; varying vec3 vW; varying vec3 vObjN;
  #include <clipping_planes_pars_fragment>
  void main(){
    #include <clipping_planes_fragment>
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(uCam - vW);
    vec3 l = normalize(uLight);
    float lam = max(dot(n,l),0.0);
    float rim = pow(1.0 - max(dot(n,v),0.0), 3.0);
    vec3 h = normalize(l+v);
    float spec = pow(max(dot(n,h),0.0), 48.0) * 0.25;
    // normal-map colour, in a slightly desaturated, print-safe range
    vec3 nm = n*0.5+0.5;
    nm = mix(vec3(dot(nm,vec3(0.333))), nm, 1.15);
    vec3 clay = uTint * (0.12 + 0.88*lam) + spec;
    vec3 spectral = nm * (0.35 + 0.75*lam) + spec*0.6;
    vec3 col = mix(clay, spectral, uSpectrum);
    col += rim * mix(vec3(0.25), nm, 0.6) * 0.55;
    gl_FragColor = vec4(col, uOpacity);
  }`;

export function spectrumMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    clipping: true,
    transparent: (opts.opacity ?? 1) < 1,
    depthWrite: (opts.opacity ?? 1) >= 1,
    side: THREE.DoubleSide,
    uniforms: {
      uLight: { value: new THREE.Vector3(0.4, 0.8, 0.6) },
      uCam: { value: new THREE.Vector3() },
      uMix: { value: 1 },
      uOpacity: { value: opts.opacity ?? 1 },
      uTint: { value: new THREE.Color(opts.tint ?? 0xd9d3c6) },
      uSpectrum: { value: opts.spectrum ?? 1 },
    },
  });
}

/**
 * Stage: a scene bound to a .well element.
 * opts.up: "z" | "y" (dataset up axis), opts.orbit: allow drag, opts.auto: auto-rotate speed
 */
export class Stage {
  constructor(el, opts = {}) {
    this.el = el;
    this.opts = opts;
    this.scene = new THREE.Scene();
    this.root = new THREE.Group();
    this.scene.add(this.root);
    if (opts.up === "z") this.root.rotation.x = -Math.PI / 2;
    if (opts.up === "-y") this.root.rotation.x = Math.PI; // OpenCV camera-world frames (y down)
    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 28, 1, 0.01, 100);
    this.camera.position.set(...(opts.camPos ?? [0, 0.25, 5.2]));
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.localClippingEnabled = true;
    el.appendChild(this.renderer.domElement);
    this.materials = new Set();
    this.light = new THREE.Vector3(0.5, 0.7, 0.8);
    this.lightTarget = this.light.clone();
    this.visible = false;
    this.t0 = performance.now();
    this.onFrame = [];
    this.frozen = false;
    STAGES.add(this);
    if (opts.orbit !== false) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.enablePan = false;
      this.controls.enableZoom = opts.zoom ?? false;
      this.controls.autoRotate = !!opts.auto;
      this.controls.autoRotateSpeed = opts.auto ?? 0.6;
      this.controls.target.set(0, 0, 0);
    }
    if (opts.lightFollowsPointer !== false) {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 2 - 1;
        const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
        this.lightTarget.set(x * 1.4, y * 1.4, 0.9).normalize();
      });
    }
    new ResizeObserver(() => this.resize()).observe(el);
    new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; if (this.visible) this.loop(); }, { rootMargin: "120px" }).observe(el);
    this.resize();
  }
  resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // shift the subject sideways on screen without moving it in 3D (keeps orbit centred on the object)
    const ox = typeof this.opts.offsetX === "function" ? this.opts.offsetX(w, h) : this.opts.offsetX;
    if (ox) this.camera.setViewOffset(w, h, -w * ox, 0, w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.render();
  }
  material(opts) { const m = spectrumMaterial(opts); this.materials.add(m); return m; }
  async addMesh(id, frame, matOpts = {}) {
    const g = await loadMesh(id);
    const mesh = new THREE.Mesh(g, this.material(matOpts));
    mesh.scale.setScalar(frame.scale);
    mesh.position.copy(frame.center).multiplyScalar(-frame.scale);
    this.root.add(mesh);
    this.render();
    return mesh;
  }
  render() {
    this.light.lerp(this.lightTarget, 0.08);
    // light is defined in view space so it tracks the pointer regardless of orbit
    const l = this.light.clone().applyQuaternion(this.camera.quaternion);
    for (const m of this.materials) {
      m.uniforms.uLight.value.copy(l);
      m.uniforms.uCam.value.copy(this.camera.position);
    }
    this.renderer.render(this.scene, this.camera);
  }
  loop() {
    if (this._raf || this.frozen) return;
    const tick = () => {
      this._raf = null;
      if (!this.visible || this.frozen) return;
      const t = (performance.now() - this.t0) / 1000;
      for (const f of this.onFrame) f(t);
      this.controls?.update();
      this.render();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }
}

/** Ring of camera frustums: DiLiGenT-MV is a 20-view turntable (18° steps). */
export function cameraRing(n = 20, radius = 2.4, color = 0xece7dc, opacity = 0.35) {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const s = 0.09, d = 0.16;
  const pts = [
    [0, 0, 0], [-s, -s * 0.75, -d], [0, 0, 0], [s, -s * 0.75, -d], [0, 0, 0], [s, s * 0.75, -d], [0, 0, 0], [-s, s * 0.75, -d],
    [-s, -s * 0.75, -d], [s, -s * 0.75, -d], [s, -s * 0.75, -d], [s, s * 0.75, -d], [s, s * 0.75, -d], [-s, s * 0.75, -d], [-s, s * 0.75, -d], [-s, -s * 0.75, -d],
  ].flat();
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const f = new THREE.LineSegments(fg, mat);
    f.position.set(Math.sin(a) * radius, 0.15, Math.cos(a) * radius);
    f.lookAt(0, 0, 0);
    g.add(f);
  }
  const ring = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 129 }, (_, i) => { const a = (i / 128) * Math.PI * 2; return new THREE.Vector3(Math.sin(a) * radius, 0.15, Math.cos(a) * radius); })
  );
  g.add(new THREE.Line(ring, new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacity * 0.45 })));
  return g;
}
