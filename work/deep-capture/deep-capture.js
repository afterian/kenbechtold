const views = {
  capture: { src: 'media/capture-lateral.jpg', alt: 'Actual captured footwear, clean lateral view with calibration targets', label: 'Captured product', qualifier: 'Actual capture / selected view', width: 1920, height: 1280 },
  detail: { src: 'media/material-knit-lacing.jpg', alt: 'Actual capture photograph showing engineered mesh, lace loops and orange stitching', label: 'Upper surface detail', qualifier: 'Source photograph / detail crop', width: 1400, height: 933 },
  wire: { src: 'media/capture-derived-wire.jpg', alt: 'Simplified wireframe derived from the actual footwear scan', label: 'Derived mesh / 4,998 triangles', qualifier: 'Actual scan / simplified visualization', width: 1920, height: 1080 }
};
const image = document.getElementById('dc-hero-image');
const video = document.getElementById('dc-hero-video');
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
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  const film = button.dataset.view === 'film';
  const view = views[button.dataset.view];
  if (!film && !view) return;
  image.hidden = film; video.hidden = !film;
  if (film) { autoStarted = true; tryPlay(); }
  else {
    video.pause(); image.src = view.src; image.alt = view.alt; image.width = view.width; image.height = view.height;
  }
  document.getElementById('dc-view-label').textContent = film ? '60-second silent film' : view.label;
  document.getElementById('dc-image-qualifier').textContent = film ? 'Animated explainer / WIP' : view.qualifier;
  document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
}));
