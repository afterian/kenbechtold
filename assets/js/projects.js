// Project navigation does not depend on the homepage fragment catalogs.
// Projects, in home-page order. The first one is the featured hero.
// Each id must match a folder: work/<id>/index.html
//
// Media: until real renders exist, form/seed/look draw a procedural placeholder.
// To use real media add  img: 'work/<id>/media/cover.jpg'  (paths from the site root)
// and optionally  hover: 'work/<id>/media/cover-wire.jpg'  for the wireframe swap.
export const PROJECTS = [
  { id: 'caitlin', title: 'Light Takes Shape', kind: 'Dream City Studios', line: 'A blue performance shoe emerges from impossible architecture and reflective material in this music-driven motion study.', tags: ['AI', 'Motion', 'Design', 'Visualization', 'product visualization', 'creative direction'], year: '2026', role: 'Creative direction + design', img: 'work/caitlin/media/cover.webp', video: 'work/caitlin/media/catilin-light-takes-shape-v1.mp4', poster: 'work/caitlin/media/cover.webp' },
  { id: 'air-liquid-max', title: 'Acid / Quilt', kind: 'Dream City Studios', line: 'Twenty hypnotic cuts through acid-yellow air chambers, violet worlds and elastic motion.', tags: ['AI', 'Motion', 'Design', 'Visualization', 'product visualization', 'creative direction'], year: '2026', role: 'Creative direction + design', img: 'work/air-liquid-max/media/cover.webp', video: 'work/air-liquid-max/media/preview.mp4', poster: 'work/air-liquid-max/media/cover.webp' },
  { id: 'almost-there', title: 'Almost There', kind: 'Dream City Studios', line: 'A small act of care becomes a journey through changing worlds. Keep going. Something amazing grows along the way.', tags: ['Motion', 'Animation', 'Design', 'Short film'], year: '2026', role: 'Creative direction + animation', img: 'work/almost-there/media/cover.webp', video: 'work/almost-there/media/preview.mp4', poster: 'work/almost-there/media/cover.webp' },
  { id: 'scout', title: 'Scout Traveler', kind: 'Dream City Studios', line: 'A contour line becomes a landscape. A landscape becomes a reason to go.', tags: ['AI', 'Motion', 'Design', 'Visualization', 'product visualization', 'creative direction'], year: '2026', role: 'Creative direction + design', img: 'work/scout/media/cover.webp', video: 'work/scout/media/scout-v2-copper-trail.mp4', poster: 'work/scout/media/cover.webp' },
  { id: 'nikeskims', title: 'Rhythm in Bone', kind: 'Dream City Studios', line: 'Warm light, red-disc choreography and moving material studies set a Waffle Racer in rhythm.', tags: ['AI', 'Motion', 'Design', 'Visualization', 'product visualization', 'creative direction'], year: '2026', role: 'Creative direction + design', img: 'work/nikeskims/media/cover.webp', video: 'work/nikeskims/media/nikeskims-rhythm-in-bone-v3.mp4', poster: 'work/nikeskims/media/cover.webp' },
  { id: 'acg', title: 'Winter. Taken in Stride.', kind: 'Dream City Studios', line: 'Tactile preparation and a demanding mountain passage open into an assured summit finish.', tags: ['AI', 'Motion', 'Design', 'Visualization', 'product visualization', 'creative direction'], year: '2026', role: 'Creative direction + design', img: 'work/acg/media/cover.webp', video: 'work/acg/media/acg-winter-taken-in-stride-v1.mp4', poster: 'work/acg/media/cover.webp' },
  { id: 'sixfold-war', title: 'The Sixfold War', kind: 'Game + agentic tools', line: 'Six factions, one hex world, and the studio built to make them.', tags: ['AI', 'Game', 'Tools'], year: '2024—27', role: 'Design + build', img: 'work/sixfold-war/media/cover.webp' },
  { id: 'mesh-research', title: 'Advanced Mesh Reconstruction', kind: 'Interactive research report', line: 'Moving beyond photogrammetry with Gaussians and photometric stereo.', tags: ['3D', 'AI', 'Research'], year: '2026', role: 'Research', img: 'work/mesh-research/assets/img/thumbs/bear_supernormal.png', form: 'knot', seed: 3, look: 0 },
  { id: 'deep-capture', title: 'Deep Capture', client: 'Nike', kind: 'Capture system', line: 'Product capture to geometry, materials and AI-ready data.', tags: ['3D', 'AI', 'Pipeline'], year: '2021—26', role: 'Systems architect', img: 'work/deep-capture/media/scanner-wip.webp', imgAlt: 'AI-edited WIP visualization of the Deep Capture scanner. Not an exact record of its hardware configuration.', imageLabel: 'AI-edited WIP' },
  { id: 'mind-002', title: 'Present Tense', kind: 'Dream City Studios', line: 'Pregame focus becomes a tactile journey through warm architecture, outsole details and shifting rhythms.', tags: ['AI', 'Motion', 'Design', 'Visualization', 'product visualization', 'creative direction'], year: '2026', role: 'Creative direction + design', img: 'work/mind-002/media/cover.webp', video: 'work/mind-002/media/preview.mp4', poster: 'work/mind-002/media/cover.webp' },
  { id: 'slate', title: 'WORLD SHIFT', kind: 'Dream City Studios', line: 'One truck, three worlds. A loop through glacial blue, electric green and burning orange.', tags: ['AI', 'Motion', 'Design', 'Visualization', 'product visualization', 'creative direction'], year: '2026', role: 'Creative direction + design', img: 'work/slate/media/glacier.webp', video: 'work/slate/media/preview.mp4', poster: 'work/slate/media/glacier.webp' },
];

// Access codes: a visitor types one in the top bar and the site reorders around their picks.
// The first id in `order` becomes the hero. These are plain text in a public file:
// good for tailoring, not for hiding confidential work.
// layout: 'collection' shows exactly these projects as one continuous page.
// Add another lowercase key with name, note, layout and order to curate a new client.
// Static codes and all files are readable if published. Never put confidential media here.
export const CODES = {
  iglab: { name: 'IGLab', note: 'Game worlds, reconstruction research, and the systems connecting capture to creation.', layout: 'collection', order: ['sixfold-war', 'mesh-research', 'deep-capture'] },
  nike: { name: 'Nike', note: 'Three picks for the Generative AI team.', order: ['sixfold-war', 'mesh-research', 'deep-capture'] },
  demo: { name: 'Studio', note: 'Lorem ipsum dolor sit amet.', order: ['deep-capture'] },
};
