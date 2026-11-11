// Case-study pages. The page content is plain HTML; this adds the 3D viewers, placeholders,
// scroll reveal, the access code, and fills the "next project" link from data.js.
// The page says which project it is with <body data-project="deep-capture">.
import { $, $$, pad, media, stills, reveal, viewerUI, bindCode, paintCode, access, ordered, curtain, projectURL, ROOT } from './ui.js';

const list = ordered(access.get());
const i = list.findIndex((p) => p.id === document.body.dataset.project);
if (i >= 0) {
  const next = list[(i + 1) % list.length];
  $$('[data-count]').forEach((el) => { el.textContent = `${pad(i + 1)} / ${pad(list.length)}`; });
  $$('[data-next]').forEach((a) => {
    a.href = projectURL(next.id);
    const t = $('[data-next-title]', a), m = $('[data-next-media]', a);
    if (t) t.textContent = next.title;
    if (m) m.outerHTML = media(next, { w: 680, h: 425, hover: false });
  });
}

$$('[data-viewer]').forEach((el) => {
  const d = el.dataset;
  viewerUI(el, { form: d.form, seed: +d.seed || 1, look: +d.look || 0, margin: 1.25 });
});

stills();
reveal();
bindCode(document, {
  onChange: async (a, fresh) => {
    if (a && fresh) await curtain(`<small>Prepared for</small><strong>${a.name}</strong>`);
    paintCode(a);
    if (fresh) location.href = ROOT;
  },
});
paintCode(access.get());
