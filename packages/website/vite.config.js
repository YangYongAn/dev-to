import { defineConfig } from 'vite'
import { execSync } from 'child_process'
import fs from 'fs'

function getGitInfo() {
  try {
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
    return { hash, branch }
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
