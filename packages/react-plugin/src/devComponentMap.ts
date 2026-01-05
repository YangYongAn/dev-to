import fs from 'node:fs'
import path from 'node:path'

import { tryResolveWithExtensions } from './pathUtils.js'

import type { DevComponentMapInput, ResolvedDevComponentConfig } from './types.js'

export function toViteFsPath(filePath: string) {
  // 保持 windows 盘符路径，同时把分隔符统一成 '/'
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? `/@fs${normalized}` : `/@fs/${normalized}`
}

function resolveDefaultEntryAbs(rootDir: string) {
  // 优先级：先尝试 Vite 模板的 src/App.*，如果都不存在则 fallback 到 src/index.*
  const appCandidates = [
    path.resolve(rootDir, 'src/App.tsx'),
    path.resolve(rootDir, 'src/App.jsx'),
    path.resolve(rootDir, 'src/App.ts'),
    path.resolve(rootDir, 'src/App.js'),
  ]
  const foundApp = appCandidates.find(p => fs.existsSync(p))
  if (foundApp) {
    return foundApp
  }

  // Fallback 到 src/index.*
  const indexCandidates = [
    path.resolve(rootDir, 'src/index.ts'),
    path.resolve(rootDir, 'src/index.tsx'),
    path.resolve(rootDir, 'src/index.jsx'),
    path.resolve(rootDir, 'src/index.js'),
  ]
  const foundIndex = indexCandidates.find(p => fs.existsSync(p))
  if (foundIndex) {
    return foundIndex
  }

  // 如果都不存在，返回 src/App.tsx 作为默认（即使文件不存在）
  return appCandidates[0]
}
function buildDevComponentMapFromRecord(
  rootDir: string,
  input: Record<string, string>,
  defaultEntryAbs: string,
  convertAt = false,
  fallbackRoot?: string,
) {
  const out: Record<string, string> = {}
  for (const [componentName, entry] of Object.entries(input)) {
    if (!componentName || !entry) continue
    // 支持 / 作为默认入口的替代符号
    if (entry === '/') {
      // 如果 convertAt 为 true，转换为默认入口路径（用于 dev 模式）
      // 否则保留 /（用于 build lib 模式识别）
      out[componentName] = convertAt ? toViteFsPath(defaultEntryAbs) : '/'
      continue
    }
    // 已经是可用 URL path / 完整 URL 的情况，直接透传
    if (entry.startsWith('http://') || entry.startsWith('https://') || entry.startsWith('/')) {
      out[componentName] = entry
      continue
    }
    const abs = path.isAbsolute(entry) ? entry : path.resolve(rootDir, entry)
    // 尝试解析扩展名，如果用户配置了 .jsx 但实际是 .tsx，会自动找到正确的文件
    let resolved = tryResolveWithExtensions(abs)
    // 如果在 root 下未找到，尝试 fallbackRoot
    if (!resolved && fallbackRoot && fallbackRoot !== rootDir) {
      const fallbackAbs = path.isAbsolute(entry) ? entry : path.resolve(fallbackRoot, entry)
      resolved = tryResolveWithExtensions(fallbackAbs)
    }
    resolved = resolved || abs
    out[componentName] = toViteFsPath(resolved)
  }
  return out
}

function getFsPathFromViteEntry(entry: string) {
  if (!entry.startsWith('/@fs')) return null
  let p = entry.slice('/@fs'.length) // '/Users/xx' or '/C:/xx'
  if (p.startsWith('/') && /\/[A-Za-z]:\//.test(p)) {
    // windows: '/C:/path' -> 'C:/path'
    p = p.slice(1)
  }
  return p
}

export function resolveDevComponentConfig(
  rootDir: string,
  devComponentMap: DevComponentMapInput,
  fallbackRoot?: string,
): ResolvedDevComponentConfig {
  const defaultEntryAbs = resolveDefaultEntryAbs(rootDir)
  const defaultEntry = toViteFsPath(defaultEntryAbs)

  let resolvedDevComponentMap: Record<string, string> = {}

  if (typeof devComponentMap === 'string') {
    const name = devComponentMap.trim()
    if (name) {
      // 单字符串参数映射
      resolvedDevComponentMap = buildDevComponentMapFromRecord(
        rootDir,
        { [name]: '/' },
        defaultEntryAbs,
        false,
        fallbackRoot,
      )
    }
    else {
      // 归一化：全匹配模式下，注入通配符 Key（使用 * 表示通配，/ 表示默认入口）
      resolvedDevComponentMap = { '*': '/' }
    }
  }
  else {
    const input = (devComponentMap ?? {}) as Record<string, string>
    if (Object.keys(input).length === 0) {
      // 归一化：全匹配模式下，注入通配符 Key（使用 * 表示通配，/ 表示默认入口）
      resolvedDevComponentMap = { '*': '/' }
    }
    else {
      // 保留 @ 用于 build lib 模式识别
      resolvedDevComponentMap = buildDevComponentMapFromRecord(
        rootDir,
        input,
        defaultEntryAbs,
        false,
        fallbackRoot,
      )
    }
  }

  const audit = (() => {
    const missing: Array<{ componentName: string, filePath: string }> = []
    for (const [componentName, entry] of Object.entries(resolvedDevComponentMap)) {
      const fsPath = getFsPathFromViteEntry(entry)
      if (fsPath) {
        // 尝试解析扩展名，如果配置了 .jsx 但实际是 .tsx，会自动找到正确的文件
        const resolved = tryResolveWithExtensions(fsPath)
        if (!resolved || !fs.existsSync(resolved)) {
          missing.push({ componentName, filePath: fsPath })
        }
      }
    }
    return {
      defaultEntryAbs,
      defaultEntryExists: fs.existsSync(defaultEntryAbs),
      componentMapCount: Object.keys(resolvedDevComponentMap).length,
      missingEntries: missing,
    }
  })()

  return {
    defaultEntryAbs,
    defaultEntry,
    componentMap: resolvedDevComponentMap,
    audit,
  }
}
