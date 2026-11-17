# Keeping pages readable during network delays

Pages carry their existing local CSS in `<style data-source="...">` blocks so a delayed separate stylesheet cannot hold the entire first paint. Canonical styles still live in the CSS files; never hand-edit generated style blocks. External web fonts are optional, non-blocking enhancements.

The homepage also includes static project/image links, generated from `assets/js/projects.js` and `data.js`, which remain usable when a module fails. Existing JavaScript replaces this fallback during normal operation. Research reading text stays visible even if its interactive/3D module graph fails.

After editing any stylesheet or homepage project/catalog data, run from the site root:

```
node .github/scripts/refresh-render-fallbacks.mjs
node .github/scripts/refresh-render-fallbacks.mjs --check
```

Node is needed only for maintenance, not for visitors. There are no package dependencies or installs. Commit the regenerated HTML with its source changes. New pages should follow the same `style data-source` convention; the attribute retains the original relative stylesheet URL. Do not add a render-blocking external font link.

Embedding styles increases individual HTML responses and duplicates cached CSS across pages; it removes a critical network dependency while keeping the visual design and media untouched. It cannot fix a document response that the browser or network never delivers. Do not describe a simulated stylesheet-delay test as a measured speedup on a user's corporate network.
