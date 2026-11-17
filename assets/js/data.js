import { FOOTWEAR } from './footwear-catalog.js';
import { FOOTWEAR_RENDERS } from './footwear-renders.js';

// Site content. Everything on the home page is rendered from this file.
// Copy here is still placeholder; titles come from the resume.

export { PROJECTS, CODES } from './projects.js';

// Fragments: single pieces shown in the grid at the bottom of the home page.
// tags support multiple filter chips; tag is the short card label.
// Video fragments preview silently on hover and open in the full player with sound.
const LOOP = { video: 'assets/media/placeholder-loop.mp4', poster: 'assets/media/placeholder-loop.jpg' };
const FILM = { video: 'assets/media/placeholder-film.mp4', poster: 'assets/media/placeholder-film.jpg' };
export const PIECES = [...FOOTWEAR_RENDERS, ...FOOTWEAR,
  { id: 's2', title: 'Loop 014', tag: 'Motion', year: '2026', form: 'ribbon', seed: 53, look: 1, ...LOOP },
  { id: 's6', title: 'Turntable', tag: 'Motion', year: '2024', form: 'shape', seed: 105, look: 2, ...LOOP },
  { id: 's11', title: 'Title card', tag: 'Motion', year: '2021', form: 'ring', seed: 170, look: 1, ...FILM },
];
