import fs from 'node:fs'
import path from 'node:path'

import { tryResolveWithExtensions } from './pathUtils.js'

import type { DevComponentMapInput, ResolvedDevComponentConfig } from './types.js'

export function toViteFsPath(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? `/@fs${normalized}` : `/@fs/${normalized}`
}

function resolveDefaultEntryAbs(rootDir: string) {
  const appCandidates = [
    path.resolve(rootDir, 'src/App.vue'),
    path.resolve(rootDir, 'src/App.ts'),
    path.resolve(rootDir, 'src/App.tsx'),
    path.resolve(rootDir, 'src/App.jsx'),
    path.resolve(rootDir, 'src/App.js'),
  ]
  const foundApp = appCandidates.find(p => fs.existsSync(p))
  if (foundApp) return foundApp

  const mainCandidates = [
    path.resolve(rootDir, 'src/main.ts'),
    path.resolve(rootDir, 'src/main.tsx'),
    path.resolve(rootDir, 'src/main.jsx'),
    path.resolve(rootDir, 'src/main.js'),
    path.resolve(rootDir, 'src/index.ts'),
    path.resolve(rootDir, 'src/index.tsx'),
    path.resolve(rootDir, 'src/index.jsx'),
    path.resolve(rootDir, 'src/index.js'),
  ]
  const foundMain = mainCandidates.find(p => fs.existsSync(p))
  if (foundMain) return foundMain

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
    if (entry === '/') {
      out[componentName] = convertAt ? toViteFsPath(defaultEntryAbs) : '/'
      continue
    }
    if (entry.startsWith('http://') || entry.startsWith('https://') || entry.startsWith('/')) {
      out[componentName] = entry
      continue
    }
    const abs = path.isAbsolute(entry) ? entry : path.resolve(rootDir, entry)
    let resolved = tryResolveWithExtensions(abs)
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
  let p = entry.slice('/@fs'.length)
  if (p.startsWith('/') && /\/[A-Za-z]:\//.test(p)) {
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
      resolvedDevComponentMap = buildDevComponentMapFromRecord(
        rootDir,
        { [name]: '/' },
        defaultEntryAbs,
        false,
        fallbackRoot,
      )
    }
    else {
      resolvedDevComponentMap = { '*': '/' }
    }
  }
  else {
    const input = (devComponentMap ?? {}) as Record<string, string>
    if (Object.keys(input).length === 0) {
      resolvedDevComponentMap = { '*': '/' }
    }
    else {
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
