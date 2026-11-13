export const normalizeCode = value => String(value ?? '').trim().toLowerCase();
export function findCode(codes, value) {
  const code = normalizeCode(value);
  return Object.hasOwn(codes, code) ? { code, ...codes[code] } : null;
}
export function selectProjects(projects, selection) {
  const ids = [...new Set(selection?.order || [])];
  const picks = ids.map(id => projects.find(project => project.id === id)).filter(Boolean).map(project => ({ ...project, picked: true }));
  const rest = selection?.layout === 'collection' ? [] : projects.filter(project => !ids.includes(project.id));
  return [...picks, ...rest].map((project, index) => ({ ...project, n: String(index + 1).padStart(2, '0') }));
}
