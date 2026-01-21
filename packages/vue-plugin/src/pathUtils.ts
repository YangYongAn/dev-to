import fs from 'node:fs'
import path from 'node:path'

import { PLUGIN_LOG_PREFIX } from './constants.js'

export function toFsPathFromViteEntry(entry: string): string | null {
  if (!entry.startsWith('/@fs')) return null
  let p = entry.slice('/@fs'.length)
  if (p.startsWith('/') && /\/[A-Za-z]:\//.test(p)) {
    p = p.slice(1)
  }
  return p
}

export function tryResolveWithExtensions(p: string): string | null {
  const exts = ['.vue', '.tsx', '.jsx', '.ts', '.js']
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

export function resolveEntryAbsPath(
  rootDir: string,
  entry: string,
  defaultEntryAbs?: string,
  fallbackRoot?: string,
): string | null {
  const tryResolveWithBase = (baseDir: string) => {
    if (entry === '/') {
      if (!defaultEntryAbs) {
        throw new Error(`${PLUGIN_LOG_PREFIX} defaultEntryAbs is required when entry is '/'`)
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
