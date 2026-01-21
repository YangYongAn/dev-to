import { DEV_TO_VUE_RESOLVE_ASSET_KEY } from '@dev-to/shared'

import { PLUGIN_LOG_PREFIX } from './constants.js'

export function transformAssetUrl(code: string, id: string) {
  if (
    id.includes('?import')
    || /\.(svg|png|jpg|jpeg|gif|webp|ico|bmp|tiff|woff|woff2|ttf|eot|otf)$/.test(id)
  ) {
    const relativePathMatch = code.match(/export\s+default\s+["']([^"']+)["']/)
    if (relativePathMatch) {
      const relativePath = relativePathMatch[1]
      if (relativePath.startsWith('/') && !relativePath.startsWith('http')) {
        const transformedCode = code.replace(
          /export\s+default\s+["']([^"']+)["']/,
          `export default (() => {
                const path = "${relativePath}";
                if (typeof window !== 'undefined' && window[${JSON.stringify(DEV_TO_VUE_RESOLVE_ASSET_KEY)}]) {
                  return window[${JSON.stringify(DEV_TO_VUE_RESOLVE_ASSET_KEY)}](path);
                }
                try {
                  const ORIGIN = new URL(import.meta.url).origin;
                  return path.startsWith('http') ? path : ORIGIN + path;
                } catch (e) {
                  console.warn('${PLUGIN_LOG_PREFIX} Failed to resolve static asset URL:', path, e);
                  return path;
                }
              })()`,
        )
        return { code: transformedCode, map: null }
      }
    }
  }
  return null
}

export function transformViteDevCssAssetUrls(code: string, id: string) {
  const cleanId = id.split('?')[0]
  if (!/\.(css|less|sass|scss|styl|stylus)$/.test(cleanId)) return null
  if (!code.includes('__vite__updateStyle') || !code.includes('const __vite__css')) return null
  if (!/url\(\s*['"]?\//.test(code)) return null
  if (code.includes('__dev_to__css')) return null

  const updateCallRE = /__vite__updateStyle\(\s*__vite__id\s*,\s*__vite__css\s*\)/
  if (!updateCallRE.test(code)) return null

  const injected = `
const __dev_to__resolveAsset = (path) => {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : window;
    const fn = g && g[${JSON.stringify(DEV_TO_VUE_RESOLVE_ASSET_KEY)}];
    if (typeof fn === 'function') return fn(path);
  } catch {
    // ignore
  }
  try {
    const origin = new URL(import.meta.url).origin;
    return path.startsWith('/') ? origin + path : origin + '/' + path;
  } catch (e) {
    console.warn('${PLUGIN_LOG_PREFIX} Failed to resolve CSS asset URL:', path, e);
    return path;
  }
};
const __dev_to__css = __vite__css.replace(/url\\(\\s*(['"]?)(\\/(?!\\/)[^'")]+)\\1\\s*\\)/g, (_m, q, p) => {
  const next = __dev_to__resolveAsset(p);
  return 'url(' + q + next + q + ')';
});
`

  const nextCode = code.replace(
    updateCallRE,
    `${injected}__vite__updateStyle(__vite__id, __dev_to__css)`,
  )

  return { code: nextCode, map: null }
}
