# Style Guide

How the site looks, and how to build a case study that matches it. Written for whoever (person or agent) adds pages next.

- Stylesheet: `assets/css/site.css`
- Living reference with every block on one page: `work/template/`
- Rule of thumb: black page, off-white type, one green accent, very few words.

---

## 1. Principles

1. **Show, don't describe.** A case study is media first. Copy is labels, one-line statements and short paragraphs (2–3 sentences at most).
2. **One accent.** Green marks the one thing to look at: a live state, a wireframe, a call to action. Never use it for body text or large fills (the access-code curtain and the "next project" hover are the only full-bleed uses).
3. **Hairlines, not boxes.** Structure comes from 1px lines and space. No shadows, no gradients on UI, corner radius is 2px (pills are fully round).
4. **Wireframe is the signature.** Wherever there is a render, offer the wireframe: hover swap on thumbnails, compare line in the viewer.
5. **Motion is quiet.** Things fade up once as they enter. Nothing loops except the 3D model and the live dot.

---

## 2. Files

```
index.html                 Home. Rendered from assets/js/data.js
StyleGuide.md              This file
assets/css/site.css        The whole design system, one file, numbered sections
assets/js/data.js          Projects, fragments, access codes  ← edit this to change the home page
assets/js/ui.js            Shared behaviour (reveal, media, codes, lightbox, viewer controls)
assets/js/home.js          Home page only
assets/js/case.js          Case-study pages only
assets/js/models.js        3D: placeholder forms, viewer, still renderer (loads three.js)
work/template/index.html   Case-study template and block reference (not indexed)
work/<id>/index.html       One folder per project. Put its media in work/<id>/media/
assets/media/              Shared media. Holds the two placeholder clips for now
scripts/new-case.py        Makes work/<id>/index.html from the template
scripts/web-video.py       Encodes a video to a web-safe .mp4 plus a .jpg poster
scripts/serve.py           Local preview server (supports video seeking)
```

All paths in HTML are relative, so the site works at a domain root or in a subfolder.

---

## 3. Tokens

Defined once in `:root` at the top of `site.css`. Use the variables, never the raw values.

### Color

| Token | Value | Use |
|---|---|---|
| `--bg` | `#08080a` | Page |
| `--bg-2` | `#0e0e11` | Panels, media frames |
| `--bg-3` | `#17181c` | Panel highlight (center of a frame) |
| `--fg` | `#f1f1ee` | Headings, primary text, primary button |
| `--fg-2` | `#b9b9bd` | Body copy |
| `--mut` | `#84848b` | Labels, meta, captions |
| `--line` | `rgba(255,255,255,.11)` | Hairlines and borders |
| `--acc` | `#33ff99` | **Signal green**, the only accent |
| `--acc-rgb` | `51 255 153` | Same color as channels: `rgb(var(--acc-rgb) / .5)` |
| `--on-acc` | `#000` | Text on the accent |
| `--err` | `#ff5a4a` | Wrong access code only |

To change the accent, edit `--acc` and `--acc-rgb` together. The 3D wireframes read `--acc` at runtime, so they follow. The favicon in each page's `<head>` has the color written in by hand (`%2333ff99`).

Contrast: `--fg` on `--bg` is about 17:1, `--fg-2` about 10:1, `--mut` about 5.3:1 (fine for labels, do not use it for paragraphs). Black on `--acc` is about 15:1. Never put `--acc` text on a light surface.

### Type

Two families, loaded from Google Fonts.

| Family | Token | Use |
|---|---|---|
| Archivo (variable width + weight) | `--sans` | Everything except labels |
| JetBrains Mono | `--mono` | Labels, meta, captions, buttons |

| Token | Size | Style | Use |
|---|---|---|---|
| `--t-display` | `clamp(3rem, 10.4vw, 11.5rem)` | 800, width 125%, uppercase, line-height .85, tracking -.028em | Hero and case titles (`.display`) |
| `--t-h2` | `clamp(1.6rem, 3.6vw, 3.4rem)` | 600, width 110%, sentence case, line-height 1.02 | Block statements |
| `--t-h3` | `clamp(1.15rem, 1.9vw, 1.8rem)` | 700, width 115%, uppercase | Card titles |
| `--t-lede` | `clamp(1.05rem, 1.6vw, 1.45rem)` | 400, line-height 1.35 | One-line summary under a title |
| `--t-body` | 15px | 400, line-height 1.5, color `--fg-2` | Paragraphs, max 56 characters wide |
| `--t-label` | 11px | Mono 500, uppercase, tracking .07em | `.mono` labels and meta |
| `--t-micro` | 10px | Mono 500, uppercase, tracking .1em | Labels on top of media |

Rules:
- Display type is always uppercase and wide (`font-stretch: 125%`). Statements (`h2`) are sentence case.
- Anything small and structural is mono, uppercase, `--mut`. Add class `mono`.
- One `h1` per page. Section statements are `h2`.

### Space, shape, motion

| Token | Value | Use |
|---|---|---|
| `--pad` | `clamp(16px, 2.6vw, 40px)` | Page gutter, left and right |
| `--gap` | `clamp(12px, 1.6vw, 24px)` | Gap between grid items |
| `--sec` | `clamp(64px, 9vw, 150px)` | Space above a section |
| `--bar` | `44px` | Fixed top bar height |
| `--r` | `2px` | Corner radius |
| `--pill` | `99px` | Chips, toggles, tags |
| `--ease` | `cubic-bezier(.2,.7,.1,1)` | Every transition |

Breakpoints: **900px** (tablet: grids collapse, meta stacks) and **560px** (phone: single column, short top bar).

---

## 4. Building a case study

### Start a page

```bash
python scripts/new-case.py my-project "My Project" "One-line summary." "Role" "2026" "3D / AI"
```

This writes `work/my-project/index.html`. Then add the project to `PROJECTS` in `assets/js/data.js` with the same `id` so it appears on the home page and in the "next project" chain.

Every case page needs these, and the generator sets them up:
- `<body data-project="my-project">` matching the id in `data.js`
- `<link rel="stylesheet" href="../../assets/css/site.css">`
- `<script type="module" src="../../assets/js/case.js">` at the end of `<body>`
- the top bar (`<header class="bar">`) copied unchanged
- content inside `<main class="cs">`

### Blocks

Stack these inside `<main class="cs">` in any order. Add `data-reveal` to a block to fade it up on scroll. Each one is shown working in `work/template/`.

**Head** — title, one-line summary, three facts. Always first.

```html
<header class="cs__head">
  <div class="cs__top mono"><a href="../../">← All work</a><span>Case study <span data-count></span></span></div>
  <h1>Project Title</h1>
  <div class="cs__sub">
    <p>One-line summary of the project.</p>
    <dl class="mono">
      <dt>Role</dt><dd>Role</dd>
      <dt>Year</dt><dd>2026</dd>
      <dt>Scope</dt><dd>3D / AI</dd>
    </dl>
  </div>
</header>
```

**Viewer** — interactive 3D with the compare line. See section 6.

```html
<section class="cs__viewer">
  <div data-viewer data-form="shape" data-seed="21" data-look="0"></div>
</section>
<div class="cs__hint mono"><span>Drag the model to rotate</span><span>Drag the line to compare</span></div>
```

**Block** — mono label on the left, statement and short copy on the right.

```html
<section class="cs__block" data-reveal>
  <span class="mono">01 — Brief</span>
  <div>
    <h2>One sentence that carries the section.</h2>
    <p>Two or three sentences of support.</p>
  </div>
</section>
```

**Steps** — three short steps, inside a block in place of the paragraph.

```html
<ol class="cs__steps">
  <li><b>Capture</b>One line.</li>
  <li><b>Process</b>One line.</li>
  <li><b>Deliver</b>One line.</li>
</ol>
```

**Sheet** — four-up breakdown (shaded, wireframe, normals, point cloud, or any four views).

```html
<section class="cs__sheet mono" data-reveal>
  <figure><div class="media"><img src="media/shaded.jpg" alt="Shaded render"></div><figcaption>Shaded</figcaption></figure>
  <figure>…</figure><figure>…</figure><figure>…</figure>
</section>
```

**Wide** — one full-width image or video.

```html
<figure class="cs__wide" data-reveal>
  <div class="media media--frame r-16x9"><img src="media/hero.jpg" alt="…"></div>
  <figcaption>Optional caption</figcaption>
</figure>
```

**Pair** — two-up.

```html
<section class="cs__pair" data-reveal>
  <figure><div class="media media--frame r-4x3"><img src="media/a.jpg" alt="…"></div><figcaption>Left</figcaption></figure>
  <figure><div class="media media--frame r-4x3"><img src="media/b.jpg" alt="…"></div><figcaption>Right</figcaption></figure>
</section>
```

**Quote** — one big statement. `<em>` takes the accent; use it on two or three words at most.

```html
<section class="cs__quote" data-reveal>
  <p>A short statement with <em>one emphasis</em>.</p>
  <cite>Source or context</cite>
</section>
```

**Nums** — up to three results. Number on top, mono label under it.

```html
<section class="cs__nums" data-reveal>
  <div><b>400+</b><span class="mono">Footwear models</span></div>
  <div>…</div><div>…</div>
</section>
```

**Next** — always last. Leave it as is; `case.js` fills in the next project from `data.js`.

```html
<a class="cs__next" data-next href="../../">
  <div><small class="mono">Next project</small><strong data-next-title>All work</strong></div>
  <div data-next-media></div>
</a>
```

A good default order: Head → Viewer or film → Block (brief) → Sheet → Block (process, with steps) → Wide (image or loop) → Nums → Next.

A project with no 3D model can skip the viewer: put a `cs__wide` with a video player or a hero image straight after the head.

---

## 5. Media

`.media` is the frame for any image, video or placeholder. It needs a size: a ratio class, or a height from its parent block.

```html
<!-- image -->
<div class="media media--frame r-16x10"><img src="media/still.jpg" alt="What it shows" loading="lazy"></div>

<!-- video: silent loop (see 5b for players and previews) -->
<div class="media media--frame r-16x9"><video src="media/loop.mp4" poster="media/loop.jpg" muted loop playsinline preload="none"></video></div>

<!-- hover swap: second image fades in on hover (use the wireframe render) -->
<a href="…"><div class="media media--frame r-16x10">
  <img class="media__a" src="media/beauty.jpg" alt="…"><img class="media__b" src="media/wire.jpg" alt="">
</div></a>

<!-- procedural placeholder until real media exists -->
<div class="media media--frame r-16x10" data-still data-form="knot" data-seed="3" data-look="0" data-w="1200" data-h="750"></div>
```

- `media--frame` adds the hairline border and dark panel. Leave it off inside a `cs__sheet` (the sheet draws its own lines).
- Ratio classes: `r-1x1`, `r-4x5`, `r-4x3`, `r-16x10`, `r-16x9`, `r-21x9`.
- Real images fill the frame (`object-fit: cover`). Export at the frame's ratio, 2x the largest display size, as WebP or JPEG. Renders look best on black or transparent backgrounds so they sit on the page.
- Captions are `<figcaption>` or `.caption`: mono, uppercase, `--mut`.
- Always write `alt` text for images that carry meaning; use `alt=""` for the hover image.

Placeholder attributes: `data-form` and `data-seed` pick the shape, `data-look` the material (0 chrome, 1 white ceramic, 2 gunmetal), `data-mode` the render (`shaded`, `wire`, `overlay`, `normals`, `clay`, `points`), `data-yaw` the rotation in radians, `data-w` / `data-h` the render size, `data-hover="wire"` adds the hover swap.

---

## 5b. Video

Video is `.mp4` in a `.media` frame, like an image. There are three behaviours, and plain HTML attributes choose between them. `case.js` and `home.js` do the rest.

| Mode | Write | What happens |
|---|---|---|
| **Loop** | `muted loop playsinline preload="none"` | Silent. Starts when a quarter of it is on screen, pauses when it leaves. A small Pause button appears on hover. |
| **Player** | `controls playsinline preload="none"` | Poster with a green Play button. Custom controls: play, seek, time, sound, fullscreen. Starts with sound on. |
| **Preview** | add `data-hover` to a loop | Plays while its link, button or frame is hovered or focused. On touch screens it plays when mostly on screen. |

```html
<!-- LOOP: turntables, UI captures, anything ambient -->
<figure class="cs__wide" data-reveal>
  <div class="media media--frame r-16x9">
    <video src="media/turntable.mp4" poster="media/turntable.jpg" muted loop playsinline preload="none"></video>
  </div>
  <figcaption>Turntable</figcaption>
</figure>

<!-- PLAYER: a film people choose to watch, with sound -->
<figure class="cs__wide" data-reveal>
  <div class="media media--frame r-16x9">
    <video src="media/film.mp4" poster="media/film.jpg" controls playsinline preload="none"></video>
  </div>
  <figcaption>Launch film</figcaption>
</figure>
```

Video works anywhere `.media` does: `cs__wide`, `cs__pair`, inside a `cs__sheet` figure. Both examples are live in `work/template/`.

Rules:
- **Always give a poster.** With `preload="none"` nothing downloads until the clip is needed, so the poster is what people see first. It also stands in if video cannot play.
- **Match the frame.** Use the ratio class that matches the clip (`r-16x9` for 16:9). Video fills the frame and crops if the ratios differ.
- **Loops are silent, always.** Browsers refuse to autoplay sound. If it needs sound, it is a player.
- **Keep loops short.** 5–15 seconds, under about 8 MB. Films: aim under 25 MB. A page with several loops only plays the ones on screen.
- **One player speaks at a time.** Starting one pauses the others. Players pause when scrolled off screen.
- Reduced-motion visitors get the poster and a Play button instead of autoplay.
- Player keys when focused: Space or K play/pause, ←/→ 5 seconds, M sound, F fullscreen.

### Encoding

```bash
python scripts/web-video.py "D:/renders/turntable.mov" work/my-project/media --name turntable
python scripts/web-video.py "D:/renders/film.mov" work/my-project/media --name film --sound
```

This writes `turntable.mp4` and `turntable.jpg` (the poster) into the project's `media/` folder. It needs ffmpeg. Output is H.264, 8-bit 4:2:0, at most 1080p and 30 fps, with the index at the front so playback starts before the download finishes. Audio is stripped unless you pass `--sound`.

- Smaller file: raise `--crf` (default 23; 26–28 is fine for flat graphics) or lower `--height 720`.
- Different poster frame: `--poster-at 2.5` (seconds).
- If you export from After Effects, Resolve or Unreal yourself: H.264 in `.mp4`, not ProRes, HEVC or 10-bit. Those will not play in every browser.
- GitHub refuses files over 100 MB and Pages sites should stay under 1 GB in total. Long films belong on Vimeo with a link.

### Video on the home page

In `assets/js/data.js`, add to any project or fragment:

```js
video: 'work/my-project/media/cover.mp4', poster: 'work/my-project/media/cover.jpg',
```

- **Project card:** shows the poster and previews the clip on hover.
- **Fragment:** previews on hover; clicking opens it in the full player with sound.
- **Featured project** (first in `PROJECTS`): the clip plays as the hero background in place of the 3D model.

### Previewing locally

```bash
python scripts/serve.py
```

Use this instead of `python -m http.server`. Seeking in a video needs a server that supports byte ranges; GitHub Pages does, the built-in Python server does not, so scrubbing would jump back to the start.

---

## 6. 3D viewer

```html
<div data-viewer data-form="ring" data-seed="5" data-look="2"></div>
```

`case.js` turns any `[data-viewer]` into a live viewer: drag to rotate, a draggable line with shaded on the left and the chosen mode on the right (Wire, Overlay, Normals, Clay, Points), a rotate toggle, and triangle and vertex counts. Give it a height through its parent (`.cs__viewer` does this).

- Forms available now (all procedural): `blob`, `shape`, `ring`, `vase`, `terrain`, `ribbon`, `knot`. A different `data-seed` gives a different variation.
- **Real models are not wired up yet.** The viewer shows placeholders only. `buildForm()` in `models.js` is the place a GLB loader plugs in.
- If three.js cannot load or the browser has no WebGL, the page still works: the viewer shows "3D preview unavailable" and placeholders stay empty frames. `<html>` gets the class `no-3d`.

---

## 7. Components outside case studies

| Component | Class | Notes |
|---|---|---|
| Top bar | `.bar` | Fixed, 44px. Name, contact links, access code. Copy it unchanged onto every page. |
| Label with live dot | `.tag` + `.dot` | "Featured 01 / 05". The dot is the only pulsing element. |
| Button | `.btn` | Off-white, black mono label, arrow in `<b>`. Turns green on hover. One per view. |
| Chips | `.chips` | Filter buttons. `aria-pressed="true"` is the active one. |
| Section header | `.sec` + `.sec__h` | Hairline, mono title on the left, count or controls on the right. |
| Project card | `.card` | Media, then number / title / year, kind underneath. Built by `home.js`. |
| Fragment tile | `.tile` | Square, opens the lightbox. Built by `home.js`. |
| Footer | `.foot` | Big email link on the home page, one mono row on case pages. |

---

## 8. Motion

- `data-reveal` on any element: fades up 26px over .9s the first time it enters the viewport. `style="--d:2"` delays it by two steps (80ms each) to stagger siblings.
- Display titles can rise line by line: wrap each word in `<span class="ln"><span style="--i:0">WORD</span></span>`.
- Hover: media scales to 1.045 over 1.1s; arrows nudge up-right by 3px.
- Everything uses `--ease`. Durations: .2–.3s for color, .4–.9s for movement.
- `prefers-reduced-motion` turns all of it off, including the model's rotation.

---

## 9. Home page content

`assets/js/data.js` drives the home page.

- `PROJECTS`: order is the order on the page; the first is the hero. Fields: `id`, `title`, `kind`, `line`, `tags`, `year`, `role`, plus media.
- `PIECES`: the fragments grid. Fields: `title`, `tag` (`3D`, `AI`, `Motion`, `Tools`), `year`, plus media.
- Media on either: `form` / `seed` / `look` for a placeholder, `img: 'work/<id>/media/cover.jpg'` (and optional `hover: '…-wire.jpg'`) for real images, or `video` + `poster` for a clip (section 5b). Paths start at the site root.
- `CODES`: access codes. `order` lists project ids to put first; the first becomes the hero. Codes are plain text in a public file, so they tailor the site but do not protect anything.

The hero is the live 3D model, or the featured project's video when it has one.

---

## 10. Browser and device support

- Current Chrome, Edge, Firefox and Safari (Safari 16.4 or newer, because of import maps). Layout is fluid from 320px up.
- Touch: the hero's compare line drifts on its own; captions that appear on hover are always visible; the viewer rotates with a horizontal drag and still lets the page scroll vertically.
- Without JavaScript the home page shows a plain list of project links, and case-study text and images are fully readable.
- Keyboard: every control is a real link or button with a visible green focus ring. Arrow keys move the compare line and page through the lightbox; Escape closes it.
- Fonts and three.js load from CDNs (Google Fonts, jsDelivr). If you want zero third-party requests, copy them into `assets/` and update the `<link>` and the import map in each page's `<head>`.

---

## 11. Do and don't

**Do**
- Keep paragraphs under three sentences and lines under 56 characters.
- Put a wireframe, clay or breakdown view next to every beauty render.
- Use real numbers in `cs__nums`, with a plain label.
- Leave generous space: let `--sec` do its job between blocks.

**Don't**
- Add a second accent color, shadows, or rounded cards.
- Set display type in sentence case, or body copy in uppercase.
- Use green for paragraphs or as a background behind media.
- Autoplay sound, or loop anything other than short silent clips.
- Put confidential work behind an access code and call it private.
