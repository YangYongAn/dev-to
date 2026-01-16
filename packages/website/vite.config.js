/* eslint-disable no-undef */
import { defineConfig } from 'vite'
import { execSync } from 'child_process'
import fs from 'fs'

function getGitInfo() {
  try {
    // Try multiple cwd options to handle different execution contexts
    const cwdOptions = ['.', '../../', process.env.GITHUB_WORKSPACE || '']

    for (const cwd of cwdOptions) {
      try {
        const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: cwd || undefined }).trim()
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', cwd: cwd || undefined }).trim()

        // If we got valid results (not empty and not 'unknown'), return them
        if (hash && hash !== 'unknown' && branch && branch !== 'unknown') {
          return { hash, branch }
        }
      }
      catch {
        // Continue to next cwd option
        continue
      }
    }

    // Fallback to env variables if git commands fail
    if (process.env.GITHUB_SHA) {
      return {
        hash: process.env.GITHUB_SHA.substring(0, 7),
        branch: process.env.GITHUB_REF_NAME || 'unknown',
      }
    }

    return { hash: 'unknown', branch: 'unknown' }
  }
  catch {
    return { hash: 'unknown', branch: 'unknown' }
  }
}

function getVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync('./package.json'))
    return pkg.version || '0.0.0'
  }
  catch {
    return '0.0.0'
  }
}

const { hash, branch } = getGitInfo()
const version = getVersion()

export default defineConfig({
  server: {
    port: 5180,
  },
  build: {
    outDir: 'dist',
  },
  define: {
    __VERSION_INFO__: JSON.stringify({
      version,
      gitHash: hash,
      gitBranch: branch,
      buildTime: new Date().toISOString(),
      buildDate: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    }),
  },
})
