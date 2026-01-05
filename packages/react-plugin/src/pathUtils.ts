import fs from 'node:fs'
import path from 'node:path'

import { PLUGIN_LOG_PREFIX } from './constants.js'

/** 将 Vite 内部的 /@fs 路径转换为真实文件系统路径 */
export function toFsPathFromViteEntry(entry: string): string | null {
  if (!entry.startsWith('/@fs')) return null
  let p = entry.slice('/@fs'.length) // '/Users/xx' or '/C:/xx'
  if (p.startsWith('/') && /\/[A-Za-z]:\//.test(p)) {
    // windows: '/C:/path' -> 'C:/path'
    p = p.slice(1)
  }
  return p
}

/** 尝试补全扩展名进行文件探测 */
export function tryResolveWithExtensions(p: string): string | null {
  const exts = ['.tsx', '.jsx', '.ts', '.js']
  if (fs.existsSync(p)) return p

  const parsed = path.parse(p)
  if (parsed.ext) {
    for (const ext of exts) {
      const cand = path.join(parsed.dir, `${parsed.name}${ext}`)
      if (fs.existsSync(cand)) return cand
    }
  }
  else {
    for (const ext of exts) {
      const cand = `${p}${ext}`
      if (fs.existsSync(cand)) return cand
    }
  }
  return null
}

/** 解析入口文件的绝对路径，支持相对路径、绝对路径和 / 开头的路径 */
export function resolveEntryAbsPath(
  rootDir: string,
  entry: string,
  defaultEntryAbs?: string,
  fallbackRoot?: string,
): string | null {
  const tryResolveWithBase = (baseDir: string) => {
    // 支持 / 作为默认入口的替代符号
    if (entry === '/') {
      if (!defaultEntryAbs) {
        throw new Error(`${PLUGIN_LOG_PREFIX} 使用 / 作为入口时，必须提供 defaultEntryAbs 参数`)
      }
      return defaultEntryAbs
    }

    const fsPath = toFsPathFromViteEntry(entry)
    if (fsPath) return tryResolveWithExtensions(fsPath)

    if (path.isAbsolute(entry)) return tryResolveWithExtensions(entry)

    if (entry.startsWith('/')) {
      const maybe = path.resolve(baseDir, entry.slice(1))
      return tryResolveWithExtensions(maybe)
    }

    const rel = path.resolve(baseDir, entry)
    return tryResolveWithExtensions(rel)
  }

  const resolved = tryResolveWithBase(rootDir)
  if (resolved) return resolved
  if (fallbackRoot && fallbackRoot !== rootDir) return tryResolveWithBase(fallbackRoot)
  return resolved
}
