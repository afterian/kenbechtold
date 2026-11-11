// Home page: featured hero, selected work, fragments.
import { PIECES } from './data.js';
import { $, $$, pad, media, stills, reveal, bindCode, paintCode, access, ordered, curtain, lightbox, createViewer, projectURL } from './ui.js';

const hero = $('[data-hero]');
const lb = lightbox();
let viewer = null, featured = null;

function render(a) {
  const list = ordered(a), f = list[0];
  const h = (k) => $(`[data-h="${k}"]`, hero);
  featured = f;
  hero.href = projectURL(f.id);
  h('label').textContent = a ? `Picked for ${a.name}` : 'Featured';
  h('count').textContent = `01 / ${pad(list.length)}`;
  h('title').setAttribute('aria-label', f.title);
  h('title').innerHTML = f.title.split(' ').map((w, i) => `<span class="ln" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join('');
  h('line').textContent = f.line;
  h('role').textContent = f.role;
  h('year').textContent = f.year;
  h('tags').textContent = f.tags.join(' / ');
  if (viewer) viewer.setForm(f.form, f.seed, f.look);

  $('[data-work-h]').textContent = a ? `Selected for ${a.name}` : 'Selected work';
  $('[data-work-n]').textContent = `(${pad(list.length - 1)})`;
  $('[data-work]').innerHTML = list.slice(1).map((p, i) => `
    <a class="card" href="${projectURL(p.id)}" data-reveal style="--d:${i % 2}">
      ${media(p, { w: 1200, h: 750, cls: 'media--frame' })}
      <span class="card__flag">${p.picked ? 'Picked for you' : ''}</span>
      <span class="card__wire">Wireframe</span>
      <div class="card__meta"><span class="n">${p.n}</span><h3>${p.title}</h3><span class="y">${p.year}</span><span class="k">${p.kind}</span></div>
    </a>`).join('');

  stills();
  reveal();
  paintCode(a);
}

/* fragments */
$('[data-frag]').innerHTML = PIECES.map((p, i) => `
  <button type="button" class="tile" data-i="${i}" data-tag="${p.tag}" data-reveal style="--d:${i % 6}">
    ${media(p, { w: 640, h: 640 })}
    <span class="tile__tag">${p.tag}</span>
    <span class="tile__cap"><span>${pad(i + 1)}</span><span>${p.title}</span></span>
  </button>`).join('');

let filter = '';
$('[data-chips]').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  filter = b.dataset.t;
  $$('[data-chips] button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  $$('.tile').forEach((t) => t.classList.toggle('off', !!filter && t.dataset.tag !== filter));
});
$('[data-frag]').addEventListener('click', (e) => {
  const t = e.target.closest('.tile');
  if (!t) return;
  const set = PIECES.filter((p) => !filter || p.tag === filter);
  lb.open(set, set.indexOf(PIECES[+t.dataset.i]));
});

bindCode(document, {
  onChange: async (a, fresh) => {
    if (a && fresh) await curtain(`<small>Prepared for</small><strong>${a.name}</strong>`);
    render(a);
    if (fresh) scrollTo(0, 0);
  },
});
render(access.get());

/* hero: live model; the wipe line follows the pointer and drifts on its own when idle */
createViewer($('canvas', hero), {
  form: featured.form, seed: featured.seed, look: featured.look,
  drag: false, parallax: 1, spin: 0.12, split: 0.62, margin: 1.22, shift: 0.42,
}).then((v) => {
  viewer = v;
  if (v && (v.form !== featured.form || v.seed !== featured.seed)) v.setForm(featured.form, featured.seed, featured.look);
});

const cur = $('.hero__cur');
let auto = true, target = 0.62, split = 0.62, cx = 0, cy = 0, tx = 0, ty = 0;
hero.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  const r = hero.getBoundingClientRect();
  auto = false;
  target = (e.clientX - r.left) / r.width;
  tx = e.clientX - r.left; ty = e.clientY - r.top;
  if (!hero.classList.contains('live')) { cx = tx; cy = ty; hero.classList.add('live'); }
});
hero.addEventListener('pointerleave', () => { auto = true; hero.classList.remove('live'); });
(function tick(t) {
  if (auto) target = 0.62 + 0.2 * Math.sin(t / 2600);
  split += (target - split) * 0.09;
  cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
  if (viewer) viewer.split = split;
  hero.style.setProperty('--split', split.toFixed(4));
  cur.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
  requestAnimationFrame(tick);
})(0);
