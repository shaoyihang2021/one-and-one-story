/**
 * Resolve a workspace asset path. The standalone build injects a `files` map
 * with data URIs; the regular web build simply returns the relative path.
 */
export function assetUrl(path) {
  const embedded = globalThis.__ONE_AND_ONE_EMBEDDED__;
  return embedded?.files?.[path] || path;
}
