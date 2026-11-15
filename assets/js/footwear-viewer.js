// Shared, on-demand viewer for reviewed footwear GLBs and their original source edges.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

function releaseTree(root) {
  if (!root) return;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [].concat(object.material || [])) materials.add(material);
  });
  materials.forEach(material => {
    Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
    material.dispose();
  });
  textures.forEach(texture => texture.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

export async function mountModelViewer(host, config) {
  let disposed = false, generation = 0, frame = 0, lastTime = 0;
  let visible = true, rotating = false, mode = 'surface', material = 'metal';
  let renderer, scene, camera, controls, environment, surface, edges, modelGroup;
  let metal, clay, depth, line, surfacePromise, wirePromise, normalization;
  let contextLost = false, resizeObserver, intersectionObserver;
  const requests = new Set(), loader = new GLTFLoader();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = [];
  const on = (node, event, fn, options) => {
    node.addEventListener(event, fn, options);
    listeners.push(() => node.removeEventListener(event, fn, options));
  };
  host.classList.add('footwear');
  host.replaceChildren();
  const viewport = document.createElement('div');
  viewport.className = 'footwear__viewport';
  const poster = document.createElement('img');
  poster.className = 'footwear__poster';
  poster.src = config.poster;
  poster.alt = `${config.title || 'Footwear'} model`;
  poster.draggable = false;
  const feedback = document.createElement('div');
  feedback.className = 'footwear__feedback';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const retry = document.createElement('button');
  retry.type = 'button'; retry.textContent = 'Retry'; retry.hidden = true;
  feedback.append(status, retry);
  viewport.append(poster, feedback);
  const toolbar = document.createElement('div');
  toolbar.className = 'footwear__toolbar';
  toolbar.setAttribute('aria-label', 'Model controls');
  const modeButtons = new Map(), materialButtons = new Map();
  function group(label) {
    const element = document.createElement('div');
    element.className = 'footwear__group';
    element.setAttribute('role', 'group'); element.setAttribute('aria-label', label);
    toolbar.append(element);
    return element;
  }
  function button(parent, label, action) {
    const element = document.createElement('button');
    element.type = 'button'; element.textContent = label;
    on(element, 'click', action); parent.append(element);
    return element;
  }
  const modes = group('Display');
  for (const [value, label] of [['surface', 'Surface'], ['overlay', 'Edges'], ['wire', 'Wire']]) {
    modeButtons.set(value, button(modes, label, () => { void setMode(value); }));
  }
  const materials = group('Material');
  for (const [value, label] of [['metal', 'Metal'], ['clay', 'Clay']]) {
    materialButtons.set(value, button(materials, label, () => setMaterial(value)));
  }
  const actions = group('View');
  const rotate = button(actions, 'Rotate', () => setRotation(!rotating));
  button(actions, 'Reset view', reset);
  const hint = document.createElement('p');
  hint.className = 'footwear__hint'; hint.textContent = 'Drag to rotate / Scroll to zoom';
  host.append(viewport, toolbar, hint);

  function state(value, message = '', canRetry = false) {
    if (disposed) return;
    host.dataset.state = value;
    status.textContent = message;
    retry.hidden = !canRetry;
    feedback.hidden = !message && !canRetry;
    poster.hidden = value === 'ready';
    if (renderer) renderer.domElement.hidden = value === 'error' || !surface;
  }
  function syncControls() {
    host.dataset.mode = mode; host.dataset.material = material;
    host.dataset.rotating = String(rotating);
    modeButtons.forEach((element, value) => element.setAttribute('aria-pressed', String(value === mode)));
    materialButtons.forEach((element, value) => element.setAttribute('aria-pressed', String(value === material)));
    rotate.setAttribute('aria-pressed', String(rotating));
  }
  function active() { return !disposed && visible && !document.hidden && !contextLost; }
  function draw() {
    if (active() && renderer && surface) renderer.render(scene, camera);
  }
  function tick(time) {
    frame = 0;
    if (!active()) { lastTime = 0; return; }
    if (rotating && modelGroup && surface) {
      if (lastTime) modelGroup.rotation.y += Math.min((time - lastTime) / 1000, .05) * .16;
      lastTime = time;
    }
    draw();
    if (rotating && surface) frame = requestAnimationFrame(tick);
  }
  function invalidate() { if (active() && !frame) frame = requestAnimationFrame(tick); }
  function pauseFrame() { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  function setRotation(value) {
    rotating = !!value; lastTime = 0; syncControls();
    if (!rotating) pauseFrame();
    invalidate();
  }
  function resize() {
    if (!renderer || !camera || disposed) return;
    const width = Math.max(1, viewport.clientWidth), height = Math.max(1, viewport.clientHeight);
    const aspect = width / height, halfHeight = Math.max(1.34, 1.75 / aspect);
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
    camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    invalidate();
  }
  function releaseGraphics() {
    pauseFrame();
    if (renderer) {
      renderer.domElement.removeEventListener('webglcontextlost', lostContext);
      renderer.domElement.removeEventListener('webglcontextrestored', restoredContext);
    }
    controls?.dispose();
    releaseTree(scene);
    // A failed initial load may leave these materials unattached to the scene.
    [metal, clay, depth, line].forEach(value => value?.dispose());
    environment?.dispose();
    if (renderer) {
      renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove();
    }
    renderer = scene = camera = controls = environment = surface = edges = modelGroup = null;
    metal = clay = depth = line = null;
  }
  function lostContext(event) {
    event.preventDefault(); contextLost = true; pauseFrame();
    generation++; requests.forEach(request => request.abort());
    state('error', '3D view interrupted.', true);
  }
  function restoredContext() { if (!disposed) state('error', '3D view ready to restart.', true); }
  function initialize() {
    releaseGraphics(); contextLost = false;
    scene = new THREE.Scene(); scene.background = new THREE.Color('#08080a');
    camera = new THREE.OrthographicCamera(-2, 2, 1.4, -1.4, .1, 100);
    camera.position.set(3.4, 2.2, 6);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
    const canvas = renderer.domElement;
    canvas.className = 'footwear__canvas'; canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', `${config.title || 'Footwear'} 3D view. Arrow keys rotate, plus and minus zoom, Home resets.`);
    canvas.addEventListener('webglcontextlost', lostContext);
    canvas.addEventListener('webglcontextrestored', restoredContext);
    viewport.insertBefore(canvas, poster);
    controls = new OrbitControls(camera, canvas);
    controls.enablePan = false; controls.enableDamping = false;
    controls.minZoom = .55; controls.maxZoom = 3.5;
    controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI - .12;
    controls.target.set(0, 0, 0); controls.update();
    controls.addEventListener('change', invalidate);
    controls.addEventListener('start', () => setRotation(false));
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try { environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; }
    finally { room.dispose(); pmrem.dispose(); }
    scene.add(new THREE.HemisphereLight('#ffffff', '#242833', 1.4));
    for (const [color, intensity, position] of [['#fff7ed', 4, [1, 4, 4]], ['#dce8ff', 3, [-3, 2, -4]]]) {
      const light = new THREE.DirectionalLight(color, intensity); light.position.set(...position); scene.add(light);
    }
    RectAreaLightUniformsLib.init();
    const fill = new THREE.RectAreaLight('#e7edf5', .6, 8, 6);
    fill.position.set(-3, 2, 5); fill.lookAt(0, 0, 0); scene.add(fill);
    metal = new THREE.MeshStandardMaterial({ color: '#5a5e68', metalness: 1, roughness: .26, envMapIntensity: 1.65 });
    clay = new THREE.MeshStandardMaterial({ color: '#96938f', metalness: 0, roughness: .78 });
    depth = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    line = new THREE.LineBasicMaterial({ color: '#33ff99', transparent: true, opacity: .45, depthWrite: false, toneMapped: false });
    modelGroup = new THREE.Group(); scene.add(modelGroup);
    resize();
  }
  async function download(url, expectedBytes, label, token) {
    const request = new AbortController(); requests.add(request);
    try {
      const response = await fetch(url, { signal: request.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const total = Number(response.headers.get('Content-Length')) || expectedBytes;
      let buffer;
      if (response.body && total) {
        const reader = response.body.getReader(), chunks = []; let length = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); length += value.byteLength;
          if (token === generation && !disposed) status.textContent = `Loading ${label} ${Math.min(100, Math.round(length / total * 100))}%`;
        }
        buffer = new Uint8Array(length); let offset = 0;
        chunks.forEach(chunk => { buffer.set(chunk, offset); offset += chunk.byteLength; });
        buffer = buffer.buffer;
      } else buffer = await response.arrayBuffer();
      if (disposed || token !== generation) throw new DOMException('Canceled', 'AbortError');
      const gltf = await loader.parseAsync(buffer, new URL('.', new URL(url, location.href)).href);
      if (disposed || token !== generation) { releaseTree(gltf.scene); throw new DOMException('Canceled', 'AbortError'); }
      return gltf.scene;
    } finally { requests.delete(request); }
  }
  function replaceMaterials(root, replacement) {
    const old = new Set();
    root.traverse(object => {
      if (!object.material) return;
      [].concat(object.material).forEach(value => old.add(value));
      object.material = replacement;
      object.renderOrder = object.isLine ? 1 : 0;
    });
    old.forEach(value => {
      Object.values(value).forEach(texture => { if (texture?.isTexture) texture.dispose(); });
      value.dispose();
    });
  }
  function normalized(root) {
    const wrapper = new THREE.Group(); wrapper.scale.setScalar(normalization.scale);
    wrapper.position.copy(normalization.center).multiplyScalar(-normalization.scale);
    wrapper.add(root); modelGroup.add(wrapper);
    return wrapper;
  }
  function applyMode() {
    if (!surface) return;
    renderer.toneMappingExposure = material === 'clay' ? .85 : 1.3;
    surface.traverse(object => {
      if (!object.isMesh) return;
      object.material = mode === 'wire' && edges ? depth : material === 'clay' ? clay : metal;
      object.material.polygonOffset = mode === 'overlay' || mode === 'wire';
      object.material.polygonOffsetFactor = 1; object.material.polygonOffsetUnits = 1;
    });
    if (edges) edges.visible = mode !== 'surface';
    if (line) line.opacity = mode === 'wire' ? .9 : .35;
    invalidate();
  }
  async function ensureWire() {
    if (edges || !surface || disposed) return;
    if (wirePromise) return wirePromise;
    const token = generation;
    state('loading', 'Loading edges...');
    // Keep the current surface visible while the optional edge download completes.
    poster.hidden = true;
    wirePromise = (async () => {
      try {
        const root = await download(config.wire, config.wireBytes, 'edges', token);
        replaceMaterials(root, line); edges = normalized(root);
        applyMode(); state('ready');
      } catch (error) {
        if (!disposed && token === generation && error.name !== 'AbortError') {
          if (mode === 'surface') state('ready');
          else state('error', 'Edges unavailable.', true);
        }
      } finally { if (token === generation) wirePromise = null; }
    })();
    return wirePromise;
  }
  async function loadSurface() {
    const token = ++generation;
    requests.forEach(request => request.abort());
    wirePromise = null;
    state('loading', 'Loading model...');
    try {
      initialize();
      const root = await download(config.model, config.modelBytes, 'model', token);
      root.updateWorldMatrix(true, true);
      const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(longest) || longest <= 0) { releaseTree(root); throw new Error('Empty model'); }
      normalization = { center: bounds.getCenter(new THREE.Vector3()), scale: 3 / longest };
      replaceMaterials(root, material === 'clay' ? clay : metal);
      surface = normalized(root);
      applyMode(); state('ready'); resize();
      if (mode !== 'surface') await ensureWire();
    } catch (error) {
      if (!disposed && token === generation && error.name !== 'AbortError') {
        releaseGraphics(); state('error', '3D view unavailable.', true);
      }
    }
  }
  async function setMode(value) {
    if (disposed || !['surface', 'overlay', 'wire'].includes(value)) return;
    mode = value; syncControls(); applyMode();
    if (surface && value !== 'surface') await ensureWire();
    else if (surface && !contextLost) state('ready');
  }
  function setMaterial(value) {
    if (disposed || !['metal', 'clay'].includes(value)) return;
    material = value; syncControls(); applyMode();
  }
  function reset() {
    if (disposed || !camera) return;
    setRotation(false); camera.position.set(3.4, 2.2, 6); camera.zoom = 1;
    controls.target.set(0, 0, 0); modelGroup.rotation.set(0, 0, 0);
    camera.updateProjectionMatrix(); controls.update(); invalidate();
  }
  function getCameraState() {
    if (!camera) return null;
    return { position: camera.position.toArray(), target: controls.target.toArray(), rotation: modelGroup.rotation.toArray(), zoom: camera.zoom };
  }
  function capturePoster() {
    if (disposed || !renderer || !surface || contextLost) throw new Error('Model is not ready');
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  }
  function dispose() {
    if (disposed) return;
    disposed = true; generation++;
    requests.forEach(request => request.abort()); requests.clear();
    resizeObserver?.disconnect(); intersectionObserver?.disconnect();
    listeners.splice(0).forEach(remove => remove());
    releaseGraphics();
    host.dataset.state = 'disposed'; host.dataset.rotating = 'false';
    if (host.footwearViewer === handle) delete host.footwearViewer;
  }
  on(retry, 'click', () => {
    if (disposed) return;
    if (surface && !contextLost && mode !== 'surface') void ensureWire();
    else { surfacePromise = loadSurface(); handle.ready = surfacePromise; }
  });
  on(viewport, 'keydown', event => {
    if (event.target !== renderer?.domElement || !camera) return;
    const directions = { ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, -.1], ArrowDown: [0, .1] };
    if (directions[event.key]) {
      event.preventDefault(); event.stopPropagation(); setRotation(false);
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      spherical.theta += directions[event.key][0]; spherical.phi += directions[event.key][1];
      spherical.phi = THREE.MathUtils.clamp(spherical.phi, .12, Math.PI - .12);
      camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target)); controls.update();
    } else if (['+', '=', '-', '_', 'Home'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation(); setRotation(false);
      if (event.key === 'Home') reset();
      else {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * (event.key === '+' || event.key === '=' ? 1.12 : 1 / 1.12), .55, 3.5);
        camera.updateProjectionMatrix(); invalidate();
      }
    }
  });
  on(document, 'visibilitychange', () => { pauseFrame(); invalidate(); });
  on(reducedMotion, 'change', event => { if (event.matches) setRotation(false); });
  if ('ResizeObserver' in window) { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(viewport); }
  else on(window, 'resize', resize);
  if ('IntersectionObserver' in window) {
    intersectionObserver = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting; pauseFrame(); invalidate();
    });
    intersectionObserver.observe(viewport);
  }
  const handle = { dispose, setMode, setMaterial, reset, capturePoster, getCameraState, ready: null };
  host.footwearViewer = handle;
  syncControls();
  surfacePromise = loadSurface(); handle.ready = surfacePromise;
  return handle;
}
