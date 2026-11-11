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
  { id: 'sixfold-war', title: 'The Sixfold War', kind: 'Game + agentic tools', line: 'A strategy game and the platform that builds it.', tags: ['AI', 'Game', 'UI'], year: '2024—26', role: 'Creative direction', form: 'ribbon', seed: 4, look: 1 },
  { id: 'arena-51', title: 'Arena 51', kind: 'Immersive tool', line: 'Side-by-side footwear comparison in real time.', tags: ['3D', 'Realtime'], year: '2022', role: 'Design + build', form: 'ring', seed: 5, look: 2 },
  { id: 'mesh-research', title: 'AI Meshing', kind: 'Research', line: 'Splats and photometric stereo for glossy surfaces.', tags: ['AI', 'Research'], year: '2025', role: 'Research', form: 'knot', seed: 3, look: 0 },
  { id: 'virtual-space', title: 'Virtual Space', kind: 'Environment', line: 'Lorem ipsum dolor sit amet consectetur.', tags: ['3D', 'Motion'], year: '2020', role: 'Design + build', form: 'terrain', seed: 9, look: 2 },
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

// Access codes: a visitor types one in the top bar and the site reorders around their picks.
// The first id in `order` becomes the hero. These are plain text in a public file:
// good for tailoring, not for hiding confidential work.
export const CODES = {
  nike: { name: 'Nike', note: 'Three picks for the Generative AI team.', order: ['sixfold-war', 'mesh-research', 'deep-capture'] },
  demo: { name: 'Studio', note: 'Lorem ipsum dolor sit amet.', order: ['arena-51', 'virtual-space', 'deep-capture'] },
};
