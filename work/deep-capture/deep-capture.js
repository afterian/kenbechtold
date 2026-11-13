// The approved scanner image is AI-edited WIP. Product modes are original illustrations, not scan output.
const hero = document.querySelector('#dc-hero-image');
const label = document.querySelector('#dc-view-label');
const labels = { scanner: 'Scanner visualization', surface: 'Surface + structure', wire: 'Geometry', points: 'Point representation' };
const alts = { scanner: 'AI-edited work-in-progress visualization of the Deep Capture scanner. Not an exact record of its hardware configuration.', surface: 'Illustrative footwear form, split between a shaded surface and green wireframe. Not a captured product.', wire: 'Illustrative green wireframe of an unbranded footwear form. Not reconstructed geometry.', points: 'Illustrative point representation of an unbranded footwear form. Not a captured point cloud or Gaussian splat.' };
for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => {
    const view = button.dataset.view;
    if (!Object.hasOwn(labels, view)) return;
    hero.src = view === 'scanner' ? 'media/scanner-wip.webp' : `media/specimen-${view}.svg`;
    document.querySelector('#dc-image-qualifier').textContent = view === 'scanner' ? 'AI-edited WIP' : 'Original illustration';
    hero.alt = alts[view];
    label.textContent = labels[view];
    document.querySelectorAll('[data-view]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  });
}
