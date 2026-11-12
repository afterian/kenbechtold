// Executive-summary triptych: the problem, and two answers, on the same object.
//   sum-noise : ILLUSTRATION of what texture matching does to a featureless surface
//               (procedural bumps, holes and stray points on the real bear scan; a slider adds "texture")
//   sum-light : REAL photometric-stereo reconstruction (SuperNormal bear), coloured by its normals
//   sum-gloss : ILLUSTRATION of the glossy case: a chrome bear whose highlights slide as it turns,
//               and the same shape as small reflective Gaussian splats (view-dependent colour)
import { THREE, Stage, loadMesh, frameFrom } from "./stage.js";

// ---------------------------------------------------------------- simplex noise (Ashima / Gustavson, MIT)
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const NOISY_VERT = /* glsl */ `
  uniform float uNoise; uniform float uAmp;
  varying vec3 vW; varying vec3 vN; varying vec3 vObj;
  ${NOISE}
  void main(){
    float n1 = snoise(position * 0.085);
    float n2 = snoise(position * 0.55 + 7.3);
    vec3 p = position + normal * uNoise * uAmp * (n1 + 0.5 * n2);
    vObj = position;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const NOISY_FRAG = /* glsl */ `
  uniform vec3 uLight; uniform vec3 uCam; uniform float uNoise;
  varying vec3 vW; varying vec3 vN; varying vec3 vObj;
  ${NOISE}
  void main(){
    // holes: patches where matching found nothing grow as texture disappears
    float h = snoise(vObj * 0.065 + 3.1);
    if (h > 1.0 - 0.62 * uNoise) discard;
    vec3 nf = normalize(cross(dFdx(vW), dFdy(vW)));       // faceted: shows every bump
    vec3 n = normalize(mix(normalize(vN), nf, clamp(uNoise * 1.4, 0.0, 1.0)));
    vec3 v = normalize(uCam - vW);
    if (dot(n, v) < 0.0) n = -n;
    vec3 l = normalize(uLight);
    float lam = max(dot(n, l), 0.0);
    vec3 nm = n * 0.5 + 0.5;
    vec3 col = nm * (0.32 + 0.78 * lam) + pow(max(dot(n, normalize(l + v)), 0.0), 40.0) * 0.25;
    col += pow(1.0 - max(dot(n, v), 0.0), 3.0) * nm * 0.35;
    gl_FragColor = vec4(col, 1.0);
  }`;

function placeIn(st, obj, frame) {
  obj.scale.setScalar(frame.scale);
  obj.position.copy(frame.center).multiplyScalar(-frame.scale);
  st.root.add(obj);
}

// ---------------------------------------------------------------- 1 · photogrammetry on a featureless surface (illustration)
export async function initNoise(el, slider) {
  const st = new Stage(el, { up: "z", auto: 0.55, camPos: [0, 0.35, 6.3], fov: 25 });
  const frame = frameFrom("bear_gt", 2.0);
  const g = await loadMesh("bear_gt");
  const mat = new THREE.ShaderMaterial({
    vertexShader: NOISY_VERT, fragmentShader: NOISY_FRAG, side: THREE.DoubleSide,
    uniforms: { uLight: { value: new THREE.Vector3(0.5, 0.7, 0.8) }, uCam: { value: new THREE.Vector3() }, uNoise: { value: 1 }, uAmp: { value: 2.1 } },
  });
  st.materials.add(mat);
  placeIn(st, new THREE.Mesh(g, mat), frame);

  // stray triangulated points: mismatches floating off the surface
  const N = 1100, pos = new Float32Array(N * 3), P = g.attributes.position, Nn = g.attributes.normal;
  let seed = 4;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    const k = Math.floor(rnd() * P.count), d = 3 + rnd() * 16;
    pos[i * 3] = P.getX(k) + Nn.getX(k) * d + (rnd() - 0.5) * 6;
    pos[i * 3 + 1] = P.getY(k) + Nn.getY(k) * d + (rnd() - 0.5) * 6;
    pos[i * 3 + 2] = P.getZ(k) + Nn.getZ(k) * d + (rnd() - 0.5) * 6;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pm = new THREE.PointsMaterial({ color: 0xff6b5a, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false });
  placeIn(st, new THREE.Points(pg, pm), frame);

  el.querySelector(".loading")?.remove();
  const read = slider?.closest(".tri-panel")?.querySelector("[data-texture-read]");
  const set = (t) => {          // t = surface texture 0..1
    const noise = 1 - t;
    mat.uniforms.uNoise.value = noise;
    pm.opacity = Math.max(0, noise * 1.15 - 0.15);
    pg.setDrawRange(0, Math.round(N * noise));
    if (read) read.textContent = t < 0.15 ? "featureless · like our bear" : t > 0.85 ? "richly textured · like the Lego" : "some texture";
    st.render();
  };
  if (slider) {
    slider.addEventListener("input", () => { set(slider.value / 100); slider.closest(".tri-ctl")?.classList.remove("attn"); });
    set(slider.value / 100);
  } else set(0);
  st.loop();
  return { stage: st };
}

// ---------------------------------------------------------------- 2 · photometric stereo (real result)
export async function initLight(el) {
  const st = new Stage(el, { up: "z", auto: 0.55, camPos: [0, 0.35, 6.3], fov: 25 });
  const frame = frameFrom("bear_gt", 2.0);
  await st.addMesh("bear_supernormal", frame, {});
  el.querySelector(".loading")?.remove();
  st.loop();
  return { stage: st };
}

// ---------------------------------------------------------------- 3 · glossy surfaces and Gaussians (illustration)
function studioEnv(renderer) {
  // a dark room with three soft boxes: bright white key, sodium warm strip, cyan rim
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x15171c);           // dim room: crisp, high-contrast reflections
  const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.09, 0.1, 0.12), side: THREE.BackSide }));
  s.add(dome);
  const box = (w, h, color, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  box(10, 6, new THREE.Color(7, 7, 6.6), 0, 7, 7);       // key
  box(8, 5, new THREE.Color(2.4, 2.4, 2.4), 3, 2, 9);     // front fill
  box(1.2, 9, new THREE.Color(5, 2.6, 0.7), -7, 1, -1);  // sodium strip
  box(1.2, 9, new THREE.Color(0.8, 3.4, 4.2), 7, 0, -3); // cyan rim
  box(14, 1, new THREE.Color(1.2, 1.2, 1.2), 0, -5, 0);  // floor bounce
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.035).texture;
  pm.dispose();
  return tex;
}

export async function initGloss(el, toggle) {
  const st = new Stage(el, { up: "z", auto: 0.7, camPos: [0, 0.35, 6.3], fov: 25, lightFollowsPointer: false });
  st.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  st.renderer.toneMappingExposure = 1.05;
  const env = studioEnv(st.renderer);
  const frame = frameFrom("bear_gt", 2.0);
  const g = await loadMesh("bear_gt");
  const chrome = new THREE.MeshStandardMaterial({ color: 0xf2efe8, metalness: 1, roughness: 0.12, envMap: env, envMapIntensity: 1.5 });
  const surface = new THREE.Mesh(g, chrome);
  placeIn(st, surface, frame);

  // Gaussians: flat ellipsoids on the surface, oriented to the local normal, each reflecting the studio
  const N = 8500, P = g.attributes.position, Nn = g.attributes.normal;
  const splatGeo = new THREE.IcosahedronGeometry(1, 1);
  const splatMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 1.35 });
  const splats = new THREE.InstancedMesh(splatGeo, splatMat, N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), z = new THREE.Vector3(0, 0, 1), nv = new THREE.Vector3(), pv = new THREE.Vector3(), sv = new THREE.Vector3(), tw = new THREE.Quaternion();
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    const k = Math.floor(rnd() * P.count);
    pv.set(P.getX(k), P.getY(k), P.getZ(k));
    nv.set(Nn.getX(k), Nn.getY(k), Nn.getZ(k)).normalize();
    q.setFromUnitVectors(z, nv);
    tw.setFromAxisAngle(z, rnd() * Math.PI); q.multiply(tw);
    const r = 1.7 + rnd() * 1.8;
    sv.set(r, r * (0.45 + rnd() * 0.5), r * 0.16);
    m4.compose(pv, q, sv);
    splats.setMatrixAt(i, m4);
  }
  splats.visible = false;
  placeIn(st, splats, frame);

  // pointer turns the studio, so highlights visibly slide across the surface
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const a = ((e.clientX - r.left) / r.width - 0.5) * Math.PI * 1.4;
    chrome.envMapRotation.set(0, a, 0); splatMat.envMapRotation.set(0, a, 0);
  });

  el.querySelector(".loading")?.remove();
  if (toggle) {
    toggle.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      const asSplats = b.dataset.mode === "splats";
      surface.visible = !asSplats; splats.visible = asSplats;
      toggle.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      toggle.closest(".tri-ctl")?.classList.remove("attn");
      st.render();
    }));
  }
  st.loop();
  return { stage: st };
}
