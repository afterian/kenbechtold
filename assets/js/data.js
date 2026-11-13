// Site content. Everything on the home page is rendered from this file.
// Copy here is still placeholder; titles come from the resume.

// Projects, in home-page order. The first one is the featured hero.
// Each id must match a folder: work/<id>/index.html
//
// Media: until real renders exist, form/seed/look draw a procedural placeholder.
// To use real media add  img: 'work/<id>/media/cover.jpg'  (paths from the site root)
// and optionally  hover: 'work/<id>/media/cover-wire.jpg'  for the wireframe swap.
export const PROJECTS = [
  { id: 'deep-capture', title: 'Deep Capture', kind: 'Capture system', line: 'Product capture to geometry, materials and AI-ready data.', tags: ['3D', 'AI', 'Pipeline'], year: '2021—26', role: 'Systems architect', form: 'shape', seed: 21, look: 0 },
  { id: 'sixfold-war', title: 'The Sixfold War', kind: 'Game + agentic tools', line: 'Six factions, one hex world, and the studio built to make them.', tags: ['AI', 'Game', 'Tools'], year: '2024—27', role: 'Design + build', img: 'work/sixfold-war/media/cover.webp' },
  { id: 'mesh-research', title: 'Advanced Mesh Reconstruction', kind: 'Interactive research report', line: 'Moving beyond photogrammetry with Gaussians and photometric stereo.', tags: ['3D', 'AI', 'Research'], year: '2026', role: 'Research', img: 'work/mesh-research/assets/img/thumbs/bear_supernormal.png', form: 'knot', seed: 3, look: 0 },
];

// Fragments: single pieces shown in the grid at the bottom of the home page.
// Same media rules as projects. tag is one of the filter chips: 3D, AI, Motion, Tools.
const NAMES = ['Material study', 'Loop 014', 'Node graph', 'Rig test', 'Splat pass', 'Turntable', 'Lighting test', 'Colorway set', 'Shader ball', 'Capture pass', 'Title card', 'Tool UI'];
const TAGS = ['3D', 'Motion', 'AI', '3D', 'AI', 'Motion', '3D', 'AI', '3D', 'Tools', 'Motion', 'Tools'];
const FORMS = ['knot', 'ribbon', 'blob', 'ring', 'terrain', 'shape', 'vase'];

export const PIECES = NAMES.map((title, i) => ({
  id: 's' + (i + 1),
  title,
  tag: TAGS[i],
  year: String(2026 - (i >> 1)),
  form: FORMS[i % 7],
  seed: 40 + i * 13,
  look: i % 3,
}));

// Video: add  video: '<path>.mp4'  and  poster: '<path>.jpg'  to any project or fragment.
// It previews silently on hover; fragments open in the full player with sound.
// A project with `video` that is first in PROJECTS plays it as the hero background.
// These three use the placeholder clips; replace them with real ones.
const LOOP = { video: 'assets/media/placeholder-loop.mp4', poster: 'assets/media/placeholder-loop.jpg' };
const FILM = { video: 'assets/media/placeholder-film.mp4', poster: 'assets/media/placeholder-film.jpg' };
Object.assign(PIECES[1], LOOP);   // Loop 014
Object.assign(PIECES[5], LOOP);   // Turntable
Object.assign(PIECES[10], FILM);  // Title card (has sound)

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
