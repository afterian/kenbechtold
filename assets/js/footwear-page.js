// Shared standalone fragment bootstrap. The viewer and model load only on this page.
const ROOT = new URL('../../', import.meta.url);
const host = document.querySelector('[data-footwear]');
const initialPoster = host?.querySelector('.footwear__poster')?.src;
let handle = null, generation = 0;

function fallback(record, message = 'Loading 3D view…', failed = false) {
  const viewport = document.createElement('div');
  viewport.className = 'footwear__viewport';
  const source = record?.model?.poster || record?.img;
  const posterURL = source ? new URL(source, ROOT).href : initialPoster;
  if (posterURL) {
    const poster = document.createElement('img');
    poster.className = 'footwear__poster'; poster.src = posterURL;
    poster.alt = `${record?.title || document.querySelector('h1')?.textContent || 'Footwear'} model`;
    viewport.append(poster);
  }
  const feedback = document.createElement('div');
  feedback.className = 'footwear__feedback';
  const status = document.createElement('span');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  status.textContent = message; feedback.append(status);
  if (failed) {
    const retry = document.createElement('button');
    retry.type = 'button'; retry.textContent = 'Retry';
    retry.addEventListener('click', () => location.reload());
    feedback.append(retry);
  }
  viewport.append(feedback); host.replaceChildren(viewport);
  host.dataset.state = failed ? 'error' : 'loading';
}

function stop() {
  ++generation;
  (handle || host?.footwearViewer)?.dispose();
  handle = null;
}

async function start() {
  if (!host) return;
  stop();
  const token = generation;
  let record;
  fallback();
  try {
    const { FOOTWEAR } = await import('./footwear-catalog.js');
    if (token !== generation) return;
    record = FOOTWEAR.find(item => item.id === document.body.dataset.fragment);
    if (!record?.model) {
      fallback(record, '3D view unavailable. Model information is missing.', true);
      return;
    }
    fallback(record);
    const { mountModelViewer } = await import('./footwear-viewer.js?v=footwear-32');
    if (token !== generation) return;
    const config = { ...record.model };
    for (const key of ['model', 'wire', 'poster']) if (config[key]) config[key] = new URL(config[key], ROOT).href;
    const mounted = await mountModelViewer(host, config);
    if (token !== generation) { mounted.dispose(); return; }
    handle = mounted;
    mounted.ready?.catch(() => {}); // Model/network failures use the viewer's poster and retry.
  } catch (error) {
    if (token !== generation) return;
    (handle || host.footwearViewer)?.dispose(); handle = null;
    fallback(record, '3D view unavailable. Retry to load the model.', true);
    console.warn('Model preview unavailable:', error);
  }
}

addEventListener('pagehide', stop);
addEventListener('pageshow', event => { if (event.persisted) void start(); });
void start();
