// Client collections reuse the actual case-study HTML. Nothing is duplicated into a second editorial source.
import { $, $$, ROOT, ordered, projectURL, stills, videos, reveal } from './ui.js';
const covers = {
  'sixfold-war': ['work/sixfold-war/media/cover.webp', 'The Sixfold War: six factions in a hex strategy world'],
  'mesh-research': ['work/mesh-research/assets/img/thumbs/bear_supernormal.png', 'Public benchmark bear reconstructed with photometric stereo'],
  'deep-capture': ['work/deep-capture/media/scanner-wip.webp', 'AI-edited WIP visualization of the Deep Capture scanner, not an exact configuration record'],
};
const shortNames = { 'sixfold-war': 'Sixfold', 'mesh-research': 'Mesh research', 'deep-capture': 'Deep Capture' };
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
let host, activeCode, reportFrame, scrollQueued = false, pendingAnchorHash = '';
// Keep an explicit project jump aligned while a slow report or webfont changes its height.
// A real scroll or pointer action immediately gives control back to the visitor.
for (const name of ['wheel', 'touchstart', 'pointerdown', 'keydown']) addEventListener(name, () => { pendingAnchorHash = ''; }, {passive:true, capture:true});
const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
function goToHash(behavior = motion()) {
  if (!host || host.hidden || !location.hash) return;
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  let element = document.getElementById(id);
  if (element) { element.scrollIntoView({ behavior, block:'start' }); return; }
  if (id.startsWith('mesh-research--') && reportFrame?.contentDocument) {
    element = reportFrame.contentDocument.getElementById(id.slice('mesh-research--'.length));
    if (element) scrollTo({ top:scrollY + reportFrame.getBoundingClientRect().top + element.getBoundingClientRect().top - 112, behavior });
  }
}
function navigateHash(hash) {
  pendingAnchorHash = hash;
  if (location.hash !== hash) history.pushState({ ...history.state }, '', hash);
  goToHash();
}
addEventListener('hashchange', () => { pendingAnchorHash = location.hash; goToHash(); });
addEventListener('popstate', () => goToHash());
function syncScroll() {
  scrollQueued = false;
  if (!host || host.hidden) return;
  const sections = $$('[data-collection-project]', host);
  const current = sections.filter(section => section.getBoundingClientRect().top <= 160).at(-1);
  $$('.collection__nav a', host).forEach(link => {
    if (link.hash === '#' + (current?.id || 'collection-index')) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  if (reportFrame?.contentWindow) {
    const rect = reportFrame.getBoundingClientRect();
    reportFrame.contentWindow.postMessage({ type:'kb-collection-viewport', height:innerHeight, offset:Math.max(0, -rect.top), visible:rect.bottom > 108 && rect.top < innerHeight }, location.origin);
  }
}
function requestSync() { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(syncScroll); } }
addEventListener('scroll', requestSync, { passive:true });
addEventListener('resize', requestSync);
addEventListener('message', event => {
  if (!reportFrame || event.origin !== location.origin || event.source !== reportFrame.contentWindow) return;
  if (event.data?.type === 'kb-collection-height' && Number.isFinite(event.data.height) && event.data.height > 0 && event.data.height < 500000) {
    reportFrame.style.height = Math.ceil(event.data.height) + 'px';
    reportFrame.dataset.ready = 'true';
    host?.querySelector('[data-report-loading-notice]')?.remove();
    if (pendingAnchorHash && location.hash === pendingAnchorHash) requestAnimationFrame(() => goToHash('instant'));
    requestSync();
  }
  if (event.data?.type === 'kb-collection-anchor' && typeof event.data.id === 'string') navigateHash('#mesh-research--' + encodeURIComponent(event.data.id));
});
function prepareContent(main, project) {
  main.querySelectorAll('script, .cs__next, footer.foot, .cs__top').forEach(element => element.remove());
  const ids = new Map([...main.querySelectorAll('[id]')].map(element => [element.id, `${project.id}--${element.id}`]));
  for (const element of main.querySelectorAll('*')) {
    if (element.id) element.id = ids.get(element.id);
    for (const name of ['aria-labelledby','aria-describedby','aria-controls','for']) {
      if (element.hasAttribute(name)) element.setAttribute(name, element.getAttribute(name).split(/\s+/).map(id => ids.get(id) || id).join(' '));
    }
    for (const name of ['src','href','poster','data-poster']) {
      if (!element.hasAttribute(name)) continue;
      const value = element.getAttribute(name);
      if (value.startsWith('#')) element.setAttribute(name, '#' + (ids.get(value.slice(1)) || project.id));
      else element.setAttribute(name, new URL(value, projectURL(project.id)).href);
    }
    if (element.hasAttribute('data-reveal')) { element.classList.remove('in','reveal-ready'); }
  }
  main.querySelectorAll('h1').forEach(heading => {
    const replacement = document.createElement('h2');
    replacement.className = 'collection-project-title'; replacement.innerHTML = heading.innerHTML;
    heading.replaceWith(replacement);
  });
  const body = document.createElement('div');
  body.className = `${main.className} collection__body`;
  body.append(...main.childNodes);
  return body;
}
function bindDeepCapture(body) {
  const hero = $('[id$="dc-hero-image"]', body), label = $('[id$="dc-view-label"]', body);
  const labels = { scanner:'Scanner visualization', surface:'Surface + structure', wire:'Geometry', points:'Point representation' };
  $$('[data-view]', body).forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.view;
    if (!Object.hasOwn(labels, view)) return;
    hero.src = new URL(view === 'scanner' ? 'media/scanner-wip.webp' : `media/specimen-${view}.svg`, projectURL('deep-capture')).href;
    $('[id$="dc-image-qualifier"]', body).textContent = view === 'scanner' ? 'AI-edited WIP' : 'Original illustration';
    hero.alt = view === 'scanner' ? 'AI-edited work-in-progress visualization of the Deep Capture scanner. Not an exact record of its hardware configuration.' : `Original illustrative product study: ${labels[view]}. Not a captured product or client asset.`;
    label.textContent = labels[view];
    $$('[data-view]', body).forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  }));
}
async function loadProject(section, project) {
  const target = $('[data-collection-content]', section);
  if (project.id === 'mesh-research') {
    target.innerHTML = `<header class="collection__report-intro"><h2>Advanced Mesh Reconstruction</h2><p>Moving beyond photogrammetry with Gaussians and photometric stereo. The complete interactive research report follows below.</p></header><p class="collection__report-note mono">Drag a mesh to orbit. Use the controls to compare results. Keep scrolling to continue to Deep Capture.</p>`;
    const iframe = document.createElement('iframe');
    iframe.style.height = Math.ceil(32 * (innerWidth >= 900 ? innerWidth * 9 / 16 : 1200)) + 'px';
    iframe.className = 'collection__report'; iframe.title = 'Complete Advanced Mesh Reconstruction interactive research report';
    iframe.src = projectURL(project.id) + '?collection=1'; iframe.setAttribute('scrolling', 'no');
    reportFrame = iframe;
    target.append(iframe);
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; requestSync(); resolve(); };
      iframe.addEventListener('load', () => {
        requestSync();
        // The child announces size after styles and fonts settle. A failed report still has its standalone link above.
        const check = () => { if (done) return; if (iframe.dataset.ready) finish(); else setTimeout(check, 100); };
        check();
      }, { once:true });
      setTimeout(() => {
        if (!iframe.dataset.ready) {
          const notice = document.createElement('p'); notice.className = 'collection__report-note'; notice.dataset.reportLoadingNotice = 'true';
          notice.innerHTML = `The report is taking longer to load. <a href="${projectURL(project.id)}">Open it on its own</a> or reload this page.`;
          iframe.before(notice);
        }
        finish();
      }, 8000);
    });
  }
  try {
    const response = await fetch(projectURL(project.id));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
    const main = parsed.querySelector('main.cs');
    if (!main) throw new Error('Case study content missing');
    const body = prepareContent(main, project);
    target.replaceChildren(body);
    if (project.id === 'deep-capture') bindDeepCapture(body);
    stills(body); videos(body); reveal(body);
  } catch (error) {
    target.innerHTML = `<p class="collection__loading">This project could not load here. <a href="${projectURL(project.id)}">Open ${escape(project.title)} directly</a>, or reload to try again.</p>`;
    console.warn('Collection project unavailable:', project.id, error);
  }
}
export async function showCollection(selection) {
  document.body.classList.add('collection-on');
  document.title = `${selection.name} | Selected work - Ken Bechtold`;
  if (host && activeCode === selection.code) { host.hidden = false; requestSync(); return; }
  if (host) { $$('video', host).forEach(video => video.pause()); host.remove(); }
  reportFrame = null;
  pendingAnchorHash = location.hash;
  activeCode = selection.code;
  const projects = ordered(selection);
  document.title = `${selection.name} | Selected work - Ken Bechtold`;
  host = document.createElement('section'); host.className = 'collection'; host.id = 'collection-index';
  host.setAttribute('aria-label', `Portfolio selected for ${selection.name}`);
  host.innerHTML = `<header class="collection__intro"><div class="collection__eyebrow mono"><span>Selected for ${escape(selection.name)}</span><span>Ken Bechtold / Selected work</span></div><h1>Selected work.<span>For ${escape(selection.name)}.</span></h1><div class="collection__lede"><p>${escape(selection.note)}</p><span class="mono">${String(projects.length).padStart(2,'0')} projects / One continuous view<br>Choose a project or keep scrolling &#8595;</span></div></header>
    <nav class="collection__index" aria-label="Visual project index">${projects.map(project => {
      const cover = covers[project.id] || [project.img, project.title];
      return `<a class="collection__card collection__card--${project.id}" href="#${project.id}"><span class="collection__card-meta mono"><span>${project.n} / ${escape(project.kind)}</span><span>&#8595;</span></span><div class="collection__card-visual"><img src="${ROOT}${cover[0]}" alt="${escape(cover[1])}" width="640" height="400"><span class="collection__jump" aria-hidden="true">&#8595;</span></div><h2>${escape(project.title)}</h2><p>${escape(project.line)}</p>${project.id === 'deep-capture' ? '<span class="collection__draft">WIP / AI-edited scanner visualization</span>' : ''}</a>`;
    }).join('')}</nav>
    <nav class="collection__nav" aria-label="Collection navigation"><a href="#collection-index" aria-current="location">Index &#8593;</a>${projects.map(project => `<a href="#${project.id}">${project.n} / ${escape(shortNames[project.id] || project.title)}</a>`).join('')}</nav>
    ${projects.map(project => `<article class="collection__project" id="${project.id}" data-collection-project><div class="collection__separator mono"><span>${project.n} / ${escape(project.title)}</span><a href="${projectURL(project.id)}">Open standalone ${project.id === 'mesh-research' ? 'report' : 'case study'} &#8599;</a></div><div data-collection-content><p class="collection__loading" role="status">Loading ${escape(project.title)}...</p></div></article>`).join('')}
    <footer class="collection__end"><div><p class="mono">End of selection / ${escape(selection.name)}</p><h2>From an idea to what comes next.</h2></div><a class="mono" href="#collection-index">Back to the index &#8593;</a></footer>`;
  document.querySelector('main').prepend(host);
  host.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    event.preventDefault(); navigateHash(link.getAttribute('href'));
  });
  const thisHost = host;
  await Promise.all(projects.map(project => loadProject(document.getElementById(project.id), project)));
  if (host !== thisHost) return;
  host.dataset.ready = 'true'; requestSync();
  if (!host.hidden && location.hash) goToHash('instant');
}
export function hideCollection() {
  document.body.classList.remove('collection-on');
  document.title = 'Ken Bechtold - AI / 3D / Motion';
  if (host && !host.hidden) { host.hidden = true; $$('video', host).forEach(video => video.pause()); scrollTo({top:0, behavior:'instant'}); }
}
