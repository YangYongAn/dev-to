#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'

const { console } = globalThis

const args = process.argv.slice(2)

if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
  printHelp()
  process.exit(0)
}

const command = args[0]
if (command !== 'build') {
  console.error(`Unknown command: ${command}`)
  printHelp()
  process.exit(1)
}

const { args: forwardedArgs, removed } = stripModeArgs(args.slice(1))
if (removed) {
  console.error('Note: --mode is managed by dev-to (lib). The provided mode is ignored.')
}

const result = spawnSync(
  process.execPath,
  [resolveViteBin(), 'build', '--mode', 'lib', ...forwardedArgs],
  { stdio: 'inherit' },
)

if (result.error) {
  console.error(`Failed to run Vite: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)

function stripModeArgs(userArgs) {
  const cleaned = []
  let removed = false

  for (let i = 0; i < userArgs.length; i += 1) {
    const arg = userArgs[i]
    if (arg === '--') {
      continue
    }
    if (arg === '--mode' || arg === '-m') {
      removed = true
      i += 1
      continue
    }
    if (arg.startsWith('--mode=')) {
      removed = true
      continue
    }
    if (arg.startsWith('-m') && arg.length > 2) {
      removed = true
      continue
    }
    cleaned.push(arg)
  }

  return { args: cleaned, removed }
}

function resolveViteBin() {
  const require = createRequire(import.meta.url)
  const searchPaths = [process.cwd(), path.join(process.cwd(), 'node_modules')]

  const resolved = resolvePath(require, 'vite/bin/vite.js', searchPaths)
  if (resolved) {
    return resolved
  }

  const viteEntry = resolvePath(require, 'vite', searchPaths)
  if (viteEntry) {
    const viteRoot = findPackageRoot(viteEntry)
    if (viteRoot) {
      const binPath = resolveBinFromPackage(viteRoot)
      if (binPath) {
        return binPath
      }
    }
  }

  console.error('Vite is not installed or could not be resolved. Please add it to devDependencies.')
  process.exit(1)
}

function resolvePath(require, specifier, searchPaths) {
  for (const base of searchPaths) {
    try {
      return require.resolve(specifier, { paths: [base] })
    }
    catch {
      // Try next path.
    }
  }

  try {
    return require.resolve(specifier)
  }
  catch {
    return null
  }
}

function findPackageRoot(startPath) {
  let current = path.dirname(startPath)
  while (true) {
    const pkgPath = path.join(current, 'package.json')
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
        if (pkg && pkg.name === 'vite') {
          return current
        }
      }
      catch {
        // Keep walking up.
      }
    }

    const parent = path.dirname(current)
    if (parent === current) {
      break
    }
    current = parent
  }

  return null
}

function resolveBinFromPackage(pkgRoot) {
  const pkgPath = path.join(pkgRoot, 'package.json')
  if (!fs.existsSync(pkgPath)) {
    return null
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    if (pkg && pkg.bin) {
      const binEntry = typeof pkg.bin === 'string'
        ? pkg.bin
        : pkg.bin.vite || pkg.bin['vite']
      if (binEntry) {
        const binPath = path.resolve(pkgRoot, binEntry)
        if (fs.existsSync(binPath)) {
          return binPath
        }
      }
    }
  }
  catch {
    // Fall back to default path.
  }

  const fallback = path.resolve(pkgRoot, 'bin', 'vite.js')
  return fs.existsSync(fallback) ? fallback : null
}

function printHelp() {
  console.log(
    [
      'dev-to <command>',
      '',
      'Commands:',
      '  build     Run "vite build --mode lib" and forward extra args.',
      '',
      'Examples:',
      '  dev-to build',
      '  dev-to build --sourcemap --outDir dist-lib',
    ].join('\n'),
  )
}
