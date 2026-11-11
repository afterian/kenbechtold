"""Create a case-study page from work/template/.

    python scripts/new-case.py <id> "<Title>" "<One-line summary>" "<Role>" "<Year>" "<Scope>" [form] [seed] [look]

Writes work/<id>/index.html. Refuses to overwrite an existing page unless --force is given.
Afterwards add the project to assets/js/data.js with the same id.
"""
import pathlib
import sys

args = [a for a in sys.argv[1:] if a != "--force"]
force = "--force" in sys.argv
if len(args) < 6:
    sys.exit(__doc__)

pid, title, line, role, year, scope = args[:6]
form = args[6] if len(args) > 6 else "shape"
seed = args[7] if len(args) > 7 else "21"
look = args[8] if len(args) > 8 else "0"

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "work" / "template" / "index.html").read_text(encoding="utf-8")

swaps = [
    ('data-project="template"', f'data-project="{pid}"'),
    ("<title>Project Title — Ken Bechtold</title>", f"<title>{title} — Ken Bechtold</title>"),
    ('<meta name="description" content="One-line summary of the project.">', f'<meta name="description" content="{line}">'),
    ('  <meta name="robots" content="noindex">\n', ""),
    ("<h1>Project Title</h1>", f"<h1>{title}</h1>"),
    ("<p>One-line summary of the project.</p>", f"<p>{line}</p>"),
    ("<dt>Role</dt><dd>Role</dd>", f"<dt>Role</dt><dd>{role}</dd>"),
    ("<dt>Year</dt><dd>2026</dd>", f"<dt>Year</dt><dd>{year}</dd>"),
    ("<dt>Scope</dt><dd>3D / AI</dd>", f"<dt>Scope</dt><dd>{scope}</dd>"),
    # placeholder model: look first, then form + seed (the seed swap would hide the look match)
    ('data-seed="21" data-look="0"', f'data-seed="21" data-look="{look}"'),
    ('data-form="shape" data-seed="21"', f'data-form="{form}" data-seed="{seed}"'),
]
for old, new in swaps:
    if old not in html:
        sys.exit(f"Template changed: could not find {old!r}")
    html = html.replace(old, new)

out = root / "work" / pid / "index.html"
if out.exists() and not force:
    sys.exit(f"{out} already exists. Pass --force to overwrite it.")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8", newline="\n")
print(f"Wrote {out.relative_to(root)}")
