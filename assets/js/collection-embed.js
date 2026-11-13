// A full-height, same-origin report: the host owns scrolling, this document owns its viewers.
const embedded = window !== parent && new URLSearchParams(location.search).get('collection') === '1';
if (embedded) {
  const root = document.documentElement;
  root.classList.add('collection-embed');
  let viewport = { height:800, offset:0, visible:false }, lastHeight = 0;
  const tell = message => parent.postMessage(message, location.origin);
  function resize() {
    const deck = document.querySelector('.deck');
    if (!deck) return;
    const height = Math.ceil(deck.getBoundingClientRect().height);
    if (height !== lastHeight) { lastHeight = height; tell({ type:'kb-collection-height', height }); }
  }
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'kb-collection-viewport') return;
    const data = event.data;
    if (!Number.isFinite(data.height) || !Number.isFinite(data.offset)) return;
    viewport = data;
    root.style.setProperty('--embed-height', Math.max(200, data.height) + 'px');
    root.style.setProperty('--embed-offset', Math.max(0, data.offset) + 'px');
    root.classList.toggle('embed-visible', data.visible);
  });
  const go = element => { if (element?.id) tell({ type:'kb-collection-anchor', id:element.id }); };
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.hash) {
      event.preventDefault(); go(document.getElementById(decodeURIComponent(url.hash.slice(1))));
    } else if (link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) { link.target = '_top'; }
  }, true);
  // Original presentation hotkeys use the iframe's height. Use the real visible host viewport instead.
  addEventListener('keydown', event => {
    if (event.target.closest?.('input,button,textarea,select,[contenteditable]')) return;
    const plates = [...document.querySelectorAll('.plate[data-title]')];
    const mid = viewport.offset + viewport.height / 2;
    const current = plates.find(plate => { const rect = plate.getBoundingClientRect(); return rect.top <= mid && rect.bottom > mid; });
    if (['ArrowRight','ArrowLeft','PageDown','PageUp'].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      const forward = event.key === 'ArrowRight' || event.key === 'PageDown';
      const index = Math.max(0, plates.indexOf(current));
      go(plates[Math.max(0, Math.min(plates.length - 1, index + (forward ? 1 : -1)))]);
    } else if (/^[1-9]$/.test(event.key) || event.key === '[' || event.key === ']') {
      event.stopImmediatePropagation();
      const well = current?.querySelector('.well[data-well]'), stage = well && window.__stages?.[well.dataset.well];
      if (!stage?.items) return;
      if (/^[1-9]$/.test(event.key)) { const item = stage.items[+event.key - 1]; if (item) stage.show(item.id); }
      else stage.step(event.key === ']' ? 1 : -1);
    }
  }, true);
  const ready = () => {
    const deck = document.querySelector('.deck');
    if (deck) new ResizeObserver(resize).observe(deck);
    resize(); document.fonts?.ready.then(resize);
    addEventListener('load', resize);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once:true}); else ready();
}
