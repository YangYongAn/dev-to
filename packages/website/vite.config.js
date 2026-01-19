/* eslint-disable no-undef */
import { defineConfig } from 'vite'
import { execSync } from 'child_process'
import fs from 'fs'

function getGitInfo() {
  // Priority 1: Vercel environment variables
  if (process.env.VERCEL_GIT_COMMIT_SHA && process.env.VERCEL_GIT_COMMIT_REF) {
    return {
      hash: process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7),
      branch: process.env.VERCEL_GIT_COMMIT_REF,
    }
  }

  // Priority 2: GitHub Actions environment variables
  if (process.env.GITHUB_SHA && process.env.GITHUB_REF_NAME) {
    return {
      hash: process.env.GITHUB_SHA.substring(0, 7),
      branch: process.env.GITHUB_REF_NAME,
    }
  }

  // Priority 3: Try git commands from multiple locations
  const cwdOptions = [
    process.env.GITHUB_WORKSPACE,
    '../../',
    '.',
  ].filter(Boolean)

  for (const cwd of cwdOptions) {
    try {
      const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd }).trim()
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', cwd }).trim()

      if (hash && branch) {
        return { hash, branch }
      }
    }
    catch {
      // Continue to next location
    }
  }

  return { hash: 'unknown', branch: 'unknown' }
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
