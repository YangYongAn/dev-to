#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import process from 'node:process'

type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown'

function detectPackageManager(userAgent: string): PackageManager {
  if (userAgent.includes('pnpm')) return 'pnpm'
  if (userAgent.includes('yarn')) return 'yarn'
  if (userAgent.includes('bun')) return 'bun'
  if (userAgent.includes('npm')) return 'npm'
  return 'unknown'
}

function normalizeTargetDir(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return ''
  return trimmed === '.' ? '.' : trimmed.replace(/\/+$/, '')
}

async function promptText(message: string, initialValue = ''): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(initialValue ? `${message} (${initialValue}): ` : `${message}: `)
    return normalizeTargetDir(answer || initialValue)
  }
  finally {
    rl.close()
  }
}

async function promptSelect(message: string, options: string[], initialIndex = 0): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    process.stdout.write(`\n${message}\n`)
    options.forEach((opt, idx) => {
      const marker = idx === initialIndex ? '*' : ' '
      process.stdout.write(`  ${marker} ${idx + 1}. ${opt}\n`)
    })
    const answer = await rl.question(`Select (1-${options.length}) [${initialIndex + 1}]: `)
    const chosen = answer.trim() ? Number(answer.trim()) - 1 : initialIndex
    if (Number.isNaN(chosen) || chosen < 0 || chosen >= options.length) return options[initialIndex]
    return options[chosen]
  }
  finally {
    rl.close()
  }
}

function run(command: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

function findViteConfigFile(projectDir: string) {
  const candidates = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.cjs']
  for (const name of candidates) {
    const p = path.join(projectDir, name)
    if (fs.existsSync(p)) return p
  }
  return null
}

function injectDevToReactPluginIntoViteConfig(content: string): string {
  const hasImport = /['"]@dev-to\/react-plugin['"]/.test(content)
  const hasCall = content.includes('devToReactPlugin(') || content.includes('devToReactPlugin()')

  let out = content

  if (!hasImport) {
    const importMatches = Array.from(out.matchAll(/^import .+$/gm))
    if (importMatches.length > 0) {
      const last = importMatches[importMatches.length - 1]!
      const insertPos = (last.index ?? 0) + last[0].length
      out = `${out.slice(0, insertPos)}\nimport { devToReactPlugin } from '@dev-to/react-plugin'\n${out.slice(insertPos)}`
    }
    else {
      out = `import { devToReactPlugin } from '@dev-to/react-plugin'\n${out}`
    }
  }

  if (!hasCall) {
    const pluginsRegex = /plugins\s*:\s*\[([\s\S]*?)\]/m
    const m = pluginsRegex.exec(out)
    if (m && typeof m.index === 'number') {
      const full = m[0]
      const inner = m[1] ?? ''

      if (inner.includes('\n')) {
        const indentMatch = inner.match(/\n(\s*)\S/)
        const indent = indentMatch ? indentMatch[1] : '  '
        const closingIndentMatch = inner.match(/\n(\s*)$/)
        const closingIndent = closingIndentMatch ? closingIndentMatch[1] : ''
        const trimmedInner = inner.replace(/\s*$/, '')
        const nextInner = `${trimmedInner}\n${indent}devToReactPlugin(),\n${closingIndent}`
        const replaced = full.replace(inner, nextInner)
        out = out.slice(0, m.index) + replaced + out.slice(m.index + full.length)
      }
      else {
        const compactInner = inner.trim()
        const nextInner = compactInner ? `${compactInner}, devToReactPlugin()` : 'devToReactPlugin()'
        const replaced = full.replace(`[${inner}]`, `[${nextInner}]`)
        out = out.slice(0, m.index) + replaced + out.slice(m.index + full.length)
      }
    }
  }

  return out
}

function addDevDependency(projectDir: string, pkgName: string, version: string) {
  const pkgPath = path.join(projectDir, 'package.json')
  const raw = fs.readFileSync(pkgPath, 'utf-8')
  const pkg = JSON.parse(raw) as Record<string, unknown>
  const devDependencies = (pkg['devDependencies'] ?? {}) as Record<string, string>
  if (!devDependencies[pkgName]) devDependencies[pkgName] = version
  pkg['devDependencies'] = devDependencies
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

async function main() {
  const userAgent = process.env.npm_config_user_agent || ''
  const pm = detectPackageManager(userAgent)

  const args = process.argv.slice(2)
  const firstNonFlag = args.find(a => !a.startsWith('-')) || ''
  const targetDirFromArg = normalizeTargetDir(firstNonFlag)

  const targetDir = targetDirFromArg || (await promptText('Project name', 'dev-to-react-app'))

  const templateChoice = await promptSelect(
    'Select a React template',
    ['react', 'react-ts', 'react-swc', 'react-swc-ts'],
    1,
  )

  const cwd = process.cwd()

  if (pm === 'pnpm') {
    await run('pnpm', ['dlx', 'create-vite@latest', targetDir, '--template', templateChoice], cwd)
  }
  else if (pm === 'npm') {
    await run('npm', ['create', 'vite@latest', targetDir, '--', '--template', templateChoice], cwd)
  }
  else {
    throw new Error(`Unsupported package manager: ${pm}`)
  }

  const projectDir = path.resolve(cwd, targetDir)

  addDevDependency(projectDir, '@dev-to/react-plugin', 'latest')

  const viteConfigPath = findViteConfigFile(projectDir)
  if (viteConfigPath) {
    const original = fs.readFileSync(viteConfigPath, 'utf-8')
    const next = injectDevToReactPluginIntoViteConfig(original)
    fs.writeFileSync(viteConfigPath, next)
  }
  else {
    process.stderr.write(
      `\n[create-react] Could not find vite.config.* in ${projectDir}. Please add @dev-to/react-plugin manually.\n`,
    )
  }

  process.stdout.write(`\n[create-react] Done. Next:\n`)
  process.stdout.write(`  cd ${targetDir}\n`)
  process.stdout.write(`  pnpm install\n`)
  process.stdout.write(`  pnpm dev\n`)
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
  process.exitCode = 1
})
