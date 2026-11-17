// Independent of the gallery/module graph. Native links remain native links.
(() => {
  let notice, showTimer, slowTimer, clearTimer;
  function reset() {
    clearTimeout(showTimer); clearTimeout(slowTimer); clearTimeout(clearTimer);
    if (notice) { notice.hidden = true; notice.textContent = ''; }
  }
  function message(text) {
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'navigation-status';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      document.body.append(notice);
    }
    notice.textContent = text;
    notice.hidden = false;
  }
  addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    // Media downloads and collection/hash controls should not show page-navigation feedback.
    if (!url.pathname.endsWith('/') && !/\.html?$/i.test(url.pathname)) return;
    reset();
    showTimer = setTimeout(() => message('Opening page…'), 180);
    slowTimer = setTimeout(() => message('Still connecting… You can try the link again.'), 8000);
    clearTimer = setTimeout(reset, 20000);
    // No preventDefault, fetch, artificial transition, unload hook or media preload.
  });
  addEventListener('pageshow', reset);
  addEventListener('pagehide', reset);
  addEventListener('keydown', (event) => { if (event.key === 'Escape') reset(); });
})();
