# Ken Bechtold

Portfolio for GitHub Pages. Static HTML, CSS and JavaScript; no build step.

## Branches

- `main` is what GitHub Pages publishes (**Settings → Pages → Deploy from a branch → main → / (root)**).
- `staging` is where the site is built and reviewed. Nothing here is live until it is merged into `main`.

## Files

- `index.html` is the home page. Its content comes from `assets/js/data.js`.
- `work/<id>/index.html` is one case study per project; `work/template/` is the starting point and block reference.
- `assets/css/site.css` is the whole design system. `StyleGuide.md` documents it and how to build a case study.
- `assets/js/` holds the scripts (`models.js` is the 3D viewer and placeholder models).
- `scripts/new-case.py` creates a new case-study page from the template.
- `scripts/web-video.py` encodes a video to a web-safe `.mp4` plus a poster image (needs ffmpeg).
- `scripts/serve.py` is the local preview server.
- `.nojekyll` tells GitHub Pages to serve the files as they are.
- `C:\Users\ken\Projects\KenBechtold-Archive` is the sibling folder for original images, videos, 3D files, and other source assets. It is outside this Git repository.

## Preview locally

The pages use JavaScript modules, so open them through a local server, not by double-clicking the file:

```powershell
python scripts\serve.py
```

Then visit http://localhost:4174/. Use this server, not `python -m http.server`: video seeking needs byte-range support, which the built-in server lacks.

## Drive backup

`scripts/sync-to-drive.ps1` copies the website and private archive to `G:\Shared drives\Dream City Studio\Projects\KenBechtold\website` and `...\archive`. Copies are incremental and do not remove older files from Drive.

The local Git hooks run the script after a commit and before a push. On a fresh clone, enable them with:

```powershell
git config --local core.hooksPath .githooks
```

To run the backup manually:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\sync-to-drive.ps1
```

The hooks run on this computer's local commits and pushes; edits made directly on GitHub do not trigger them. Drive for desktop must be running and signed in for the mounted `G:` destination to upload.
