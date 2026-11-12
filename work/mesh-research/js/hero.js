// Cover: the scanned bear condenses out of a cloud of points into a surface,
// coloured by its own normals, inside the 20-camera turntable ring of the dataset.
// Move the pointer to move the light: that interaction *is* photometric stereo.
import { THREE, Stage, loadMesh, frameFrom, cameraRing } from "./stage.js";

const PVERT = /* glsl */ `
  attribute vec3 aStart; attribute float aDelay; attribute vec3 aNormal;
  uniform float uT; uniform float uSize; uniform mat3 uRootRot;
  varying vec3 vC; varying float vA;
  float ease(float x){ return 1.0 - pow(1.0 - clamp(x,0.0,1.0), 4.0); }
  void main(){
    float k = ease((uT - aDelay) / 1.6);
    vec3 p = mix(aStart, position, k);
    vec3 n = normalize(uRootRot * aNormal);
    vC = n*0.5+0.5;
    vA = 0.25 + 0.75*k;
    vec4 mv = modelViewMatrix * vec4(p,1.0);
    gl_PointSize = uSize * (1.0 + (1.0-k)*1.5) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const PFRAG = /* glsl */ `
  uniform float uFade; varying vec3 vC; varying float vA;
  void main(){
    vec2 d = gl_PointCoord - 0.5; float r = dot(d,d);
    if (r > 0.25) discard;
    gl_FragColor = vec4(vC, vA * (1.0 - uFade) * smoothstep(0.25, 0.0, r));
  }`;

export async function initHero(el) {
  const st = new Stage(el, { up: "z", orbit: true, auto: 0.35, camPos: [0, 1.9, 9.4], fov: 24, offsetX: (w) => (w >= 900 ? 0.21 : 0) });
  st.controls.minPolarAngle = Math.PI * 0.32;
  st.controls.maxPolarAngle = Math.PI * 0.52;
  const frame = frameFrom("bear_gt", 1.8);
  const ring = cameraRing(20, 2.3, 0xece7dc, 0.38);
  ring.position.y = -0.35;
  st.scene.add(ring);

  const g = await loadMesh("bear_gt");
  el.querySelector(".loading")?.remove();

  // --- points
  const n = g.attributes.position.count;
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", g.attributes.position);
  pg.setAttribute("aNormal", g.attributes.normal);
  const start = new Float32Array(n * 3), delay = new Float32Array(n);
  const c = frame.center, R = Math.max(frame.ext.x, frame.ext.y, frame.ext.z) * 1.8;
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = R * Math.cbrt(Math.random());
    const s = Math.sqrt(1 - u * u);
    start[i * 3] = c.x + r * s * Math.cos(th);
    start[i * 3 + 1] = c.y + r * s * Math.sin(th);
    start[i * 3 + 2] = c.z + r * u;
    const z = (g.attributes.position.getZ(i) - (c.z - frame.ext.z / 2)) / frame.ext.z; // bottom-up build
    delay[i] = 0.2 + z * 1.4 + Math.random() * 0.5;
  }
  pg.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
  pg.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
  const rootRot = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  const pmat = new THREE.ShaderMaterial({
    vertexShader: PVERT, fragmentShader: PFRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uSize: { value: 2.2 * (st.renderer.getPixelRatio()) * 6 }, uFade: { value: 0 }, uRootRot: { value: rootRot } },
  });
  const pts = new THREE.Points(pg, pmat);
  pts.scale.setScalar(frame.scale);
  pts.position.copy(frame.center).multiplyScalar(-frame.scale);
  st.root.add(pts);

  // --- surface (fades in once the cloud has landed)
  const mesh = await st.addMesh("bear_gt", frame, { opacity: 0.0001 });
  mesh.material.transparent = true;

  const T_SURF = 3.6;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  st.t0 = performance.now() - (reduce ? 10000 : 0);
  st.onFrame.push((t) => {
    pmat.uniforms.uT.value = t;
    const f = THREE.MathUtils.smoothstep(t, T_SURF, T_SURF + 1.4);
    mesh.material.uniforms.uOpacity.value = Math.max(f, 0.0001);
    mesh.material.depthWrite = f > 0.98;
    pmat.uniforms.uFade.value = f * 0.92;
    ring.rotation.y = t * 0.05;
    if (!st._userLight) {
      const a = t * 0.35;
      st.lightTarget.set(Math.sin(a) * 1.1, 0.55 + Math.cos(a * 0.7) * 0.35, 0.85).normalize();
    }
  });
  el.addEventListener("pointermove", () => (st._userLight = true));
  el.addEventListener("pointerleave", () => (st._userLight = false));
  st.loop();
  return st;
}
