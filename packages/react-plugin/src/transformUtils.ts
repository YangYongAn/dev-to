/**
 * 注入 React 运行时导入
 * 用于 lib build + JSX classic 模式下，确保 React 标识符存在
 */
import { DEV_TO_REACT_RESOLVE_ASSET_KEY } from '@dev-to/react-shared'

import { PLUGIN_LOG_PREFIX } from './constants.js'

export function injectReactImport(code: string, id: string) {
  const cleanId = id.split('?')[0]
  if (cleanId.includes('/node_modules/')) return null
  if (!/\.([tj])sx$/.test(cleanId)) return null

  const hasReactRuntimeImport
    = /^\s*import\s+(?!type)(?:\*\s+as\s+React|React)\b[\s\S]*?\bfrom\s*['"]react['"]\s*;?/m.test(
      code,
    )

  if (!hasReactRuntimeImport) {
    return { code: `import * as React from 'react'\n${code}`, map: null }
  }
  return null
}

/**
 * 转换静态资源导入路径
 * 在 Electron file:// 宿主中，将相对路径转换为带 Origin 的完整 URL
 */
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
                if (typeof window !== 'undefined' && window[${JSON.stringify(DEV_TO_REACT_RESOLVE_ASSET_KEY)}]) {
                  return window[${JSON.stringify(DEV_TO_REACT_RESOLVE_ASSET_KEY)}](path);
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
