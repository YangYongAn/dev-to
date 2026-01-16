#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
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

  for (const base of searchPaths) {
    try {
      return require.resolve('vite/bin/vite.js', { paths: [base] })
    }
    catch {
      // Try next path.
    }
  }

  try {
    return require.resolve('vite/bin/vite.js')
  }
  catch {
    console.error('Vite is not installed. Please add it to devDependencies.')
    process.exit(1)
  }
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
