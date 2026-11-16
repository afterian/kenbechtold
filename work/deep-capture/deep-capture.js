// Film is explanatory WIP; product tabs remain original illustrations.
const hero = document.querySelector('#dc-hero-image');
const video = document.querySelector('#dc-hero-video');
const label = document.querySelector('#dc-view-label');
const qualifier = document.querySelector('#dc-image-qualifier');
const labels = { scanner: '60-second silent film', surface: 'Surface + structure', wire: 'Geometry', points: 'Point representation' };
const alts = { surface: 'Illustrative footwear form, split between a shaded surface and green wireframe. Not a captured product.', wire: 'Illustrative green wireframe of an unbranded footwear form. Not reconstructed geometry.', points: 'Illustrative point representation of an unbranded footwear form. Not a captured point cloud or Gaussian splat.' };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let autoStarted = false;
const tryPlay = () => video.play().catch(() => {});
new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) video.pause();
    else if (!video.hidden && !reduceMotion.matches && !autoStarted) { autoStarted = true; tryPlay(); }
  }
}, { threshold: 0.25 }).observe(video);
reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) video.pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => {
    const view = button.dataset.view;
    if (!Object.hasOwn(labels, view)) return;
    const film = view === 'scanner';
    video.hidden = !film; hero.hidden = film;
    if (film) { autoStarted = true; tryPlay(); }
    else { video.pause(); hero.src = `media/specimen-${view}.svg`; hero.alt = alts[view]; }
    qualifier.textContent = film ? 'Animated explainer / WIP' : 'Original illustration';
    label.textContent = labels[view];
    document.querySelectorAll('[data-view]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  });
}
