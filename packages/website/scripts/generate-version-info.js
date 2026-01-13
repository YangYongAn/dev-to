#!/usr/bin/env node

import { execSync } from 'child_process'
import { writeFileSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = resolve(fileURLToPath(import.meta.url), '..')

function getGitInfo() {
  try {
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
    return { hash, branch }
  }
  catch (err) {
    console.warn('Unable to get git info:', err.message)
    return { hash: 'unknown', branch: 'unknown' }
  }
}

function getVersion() {
  try {
    const pkgPath = resolve(__dirname, '../package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return pkg.version || '0.0.0'
  }
  catch {
    return '0.0.0'
  }
}

// Generate version info
const { hash, branch } = getGitInfo()
const version = getVersion()
const buildTime = new Date().toISOString()

const versionInfo = {
  version,
  gitHash: hash,
  gitBranch: branch,
  buildTime,
  buildDate: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
}

// Write as JavaScript module
const jsContent = `// Auto-generated version info
export const versionInfo = ${JSON.stringify(versionInfo, null, 2)};
`

writeFileSync(resolve(__dirname, '../src/version-info.js'), jsContent)

console.log('✓ Version info generated:', versionInfo)
