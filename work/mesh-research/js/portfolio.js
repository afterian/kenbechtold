// Shared portfolio navigation around the unmodified research report.
import { $, media, stills, videos, bindCode, paintCode, access, ordered, projectURL, ROOT } from '../../../assets/js/ui.js';
const header = document.getElementById('portfolio-header');
const footer = document.getElementById('portfolio-footer');
function paintNext() {
  const list = ordered(access.get());
  const i = list.findIndex(p => p.id === document.body.dataset.project);
  if (i < 0 || list.length < 2) return;
  const next = list[(i + 1) % list.length];
  $('[data-next]', footer).href = projectURL(next.id);
  $('[data-next-title]', footer).textContent = next.title;
  const previous = $('[data-next-media]', footer) || $('[data-next] .media', footer);
  if (previous) previous.outerHTML = media(next, { w:680, h:425, hover:false });
  stills(footer);
  videos(footer);
}
bindCode(header, { onChange(a, fresh) {
  paintCode(a);
  paintNext();
  if (fresh) location.href = ROOT;
}});
paintCode(access.get());
paintNext();

// The report's original paging assumes a zero-height header. Keep the same keys
// and plate ordering, accounting for the portfolio bar and the new bottom section.
addEventListener('keydown', (event) => {
  if (!['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(event.key) ||
      event.target.closest?.('input, button, textarea, select, [contenteditable]')) return;
  const plates = [...document.querySelectorAll('.deck .plate[data-title]'), footer];
  if (!plates.length) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const forward = event.key === 'ArrowRight' || event.key === 'PageDown';
  let current = plates.findIndex(plate => plate.getBoundingClientRect().top > -innerHeight * 0.4);
  if (current < 0) current = plates.length - 1;
  const barHeight = header.querySelector('.bar').getBoundingClientRect().height;
  const step = forward ? (plates[current].getBoundingClientRect().top < barHeight + 4 ? 1 : 0) : -1;
  const next = plates[Math.max(0, Math.min(plates.length - 1, current + step))];
  next.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}, true);
