// Small, optional enhancements. Text and tiny video posters work before this module arrives.
let posterObserver, revealObserver;
const posterWatched = new WeakSet(), posterPending = new WeakSet(), revealWatched = new WeakSet();

function loadPoster(video) {
  const src = video.dataset.poster;
  if (!src || posterPending.has(video)) return;
  posterPending.add(video);
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'low';
  image.onload = () => {
    // Keep the tiny preview until the full image actually succeeds.
    video.poster = src;
    delete video.dataset.poster;
    posterPending.delete(video);
    if (posterObserver) posterObserver.unobserve(video);
  };
  image.onerror = () => { posterPending.delete(video); }; // retain preview; retry on re-entry or play
  image.src = src;
}

export function observePosters(root = document) {
  if (!posterObserver && typeof IntersectionObserver !== 'undefined') {
    posterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) loadPoster(entry.target); });
    }, { rootMargin: '600px 0px' });
  }
  root.querySelectorAll('video[data-poster]').forEach((video) => {
    if (posterWatched.has(video)) return;
    posterWatched.add(video);
    // Native controls still work if enhancement scripts are unavailable.
    ['pointerenter', 'focus', 'play'].forEach((name) => video.addEventListener(name, () => loadPoster(video)));
    if (posterObserver) posterObserver.observe(video); else loadPoster(video);
  });
}

export function reveal(root = document) {
  const elements = root.querySelectorAll('[data-reveal]:not(.in)');
  if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach((el) => el.classList.add('in'));
    return;
  }
  revealObserver = revealObserver || new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -6% 0px' });
  elements.forEach((el) => {
    if (revealWatched.has(el)) return;
    revealWatched.add(el);
    // Never hide content the visitor can already see while scripts finish loading.
    if (el.getBoundingClientRect().top < innerHeight) { el.classList.add('in'); return; }
    revealObserver.observe(el);
    el.classList.add('reveal-ready');
  });
}
