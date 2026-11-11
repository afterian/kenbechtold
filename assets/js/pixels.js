// Pixel motion: a tiny cellular automaton (Conway's Life with fading trails) drawn in the accent color.
//   <div class="pixels" data-pixels></div>        data-pixels="12" sets the cell size in px (default 8)
// Give the element a height. It only runs while on screen, and draws one still frame for
// reduced-motion visitors. No dependencies.
export function pixels(root = document) {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue('--acc-rgb').trim().split(/\s+/).map(Number);
  const [R, G, B] = rgb.length === 3 ? rgb : [51, 255, 153];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.querySelectorAll('[data-pixels]:not([data-pdone])').forEach((el) => {
    el.dataset.pdone = '1';
    const cell = +el.dataset.pixels || 8;
    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    el.append(c);
    const ctx = c.getContext('2d');
    let cols = 0, rows = 0, a, b, trail, img, seen = false, last = 0, n = 0;

    const sprinkle = (share) => { for (let i = 0, k = cols * rows * share; i < k; i++) a[(Math.random() * a.length) | 0] = 1; };
    const size = () => {
      const w = Math.max(4, Math.ceil(el.clientWidth / cell)), h = Math.max(4, Math.ceil(el.clientHeight / cell));
      if (w === cols && h === rows) return;
      cols = w; rows = h; c.width = w; c.height = h;
      a = new Uint8Array(w * h); b = new Uint8Array(w * h); trail = new Uint8Array(w * h);
      img = ctx.createImageData(w, h);
      sprinkle(0.14);
      draw();
    };
    const step = () => {
      for (let y = 0; y < rows; y++) {
        const up = ((y + rows - 1) % rows) * cols, mid = y * cols, dn = ((y + 1) % rows) * cols;
        for (let x = 0; x < cols; x++) {
          const l = (x + cols - 1) % cols, r = (x + 1) % cols, i = mid + x;
          const k = a[up + l] + a[up + x] + a[up + r] + a[mid + l] + a[mid + r] + a[dn + l] + a[dn + x] + a[dn + r];
          const live = k === 3 || (k === 2 && a[i]) ? 1 : 0;
          b[i] = live;
          trail[i] = live ? 255 : Math.max(0, trail[i] - 20);
        }
      }
      [a, b] = [b, a];
      if (++n % 30 === 0) sprinkle(0.012); // keep it from settling
    };
    function draw() {
      const d = img.data;
      for (let i = 0, p = 0; i < a.length; i++, p += 4) {
        d[p] = R; d[p + 1] = G; d[p + 2] = B;
        d[p + 3] = a[i] ? 255 : trail[i] * 0.4; // live cells solid, trails fade out
      }
      ctx.putImageData(img, 0, 0);
    }

    new ResizeObserver(size).observe(el);
    size();
    if (still) { for (let i = 0; i < 12; i++) step(); draw(); return; }
    new IntersectionObserver((e) => { seen = e[0].isIntersecting; }).observe(el);
    (function loop(t) {
      requestAnimationFrame(loop);
      if (!seen || document.hidden || t - last < 90) return; // about 11 steps a second
      last = t; step(); draw();
    })(0);
  });
}
