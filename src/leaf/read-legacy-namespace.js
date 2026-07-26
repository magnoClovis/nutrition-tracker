export function readLegacyNamespace(root, namespace, exportNames) {
  const api = root && root[namespace];
  if (!api || typeof api !== 'object') {
    throw new TypeError(`Missing legacy namespace: ${namespace}`);
  }
  exportNames.forEach(name => {
    if (!(name in api)) {
      throw new TypeError(`Missing legacy export: ${namespace}.${name}`);
    }
  });
  return api;
}
