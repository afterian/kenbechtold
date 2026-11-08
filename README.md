# Ken Bechtold

Minimal portfolio for GitHub Pages.

## Files

- `index.html` is the complete website. In GitHub, set **Settings → Pages → Deploy from a branch → main → / (root)**.
- `assets/` is for optimized artwork that may be published on the site.
- `C:\Users\ken\Projects\KenBechtold-Archive` is the sibling folder for original images, videos, 3D files, and other source assets. It is outside this Git repository.

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
