#!/usr/bin/env node
/* global console, process */
import { context } from 'esbuild'
import { execSync } from 'node:child_process'
import fs from 'node:fs'

// Get git information
function getGitInfo() {
  try {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
    return { commit, branch }
  }
  catch (e) {
    console.warn('Unable to get git info:', e.message)
    return { commit: 'unknown', branch: 'unknown' }
  }
}

// Get build time in UTC
function getBuildTime() {
  const now = new Date()
  return now.toISOString().slice(0, 16).replace('T', ' ')
}

// Get package version
function getPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
  return pkg.version || 'unknown'
}

const { commit, branch } = getGitInfo()
const buildTime = getBuildTime()
const version = getPackageVersion()

const isWatch = process.argv.includes('--watch') || process.argv.includes('-w')

if (isWatch) {
  console.log(`Starting watch mode with: commit=${commit}, branch=${branch}, buildTime=${buildTime}, version=${version}`)
}
else {
  console.log(`Building with: commit=${commit}, branch=${branch}, buildTime=${buildTime}, version=${version}`)
}

const buildOptions = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: false,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  define: {
    __GIT_COMMIT__: JSON.stringify(commit),
    __GIT_BRANCH__: JSON.stringify(branch),
    __BUILD_TIME__: JSON.stringify(buildTime),
    __PACKAGE_VERSION__: JSON.stringify(version),
  },
  packages: 'external',
}

const ctx = await context(buildOptions)

if (isWatch) {
  await ctx.watch()
  console.log('Watching for changes...')
}
else {
  await ctx.rebuild()
  await ctx.dispose()
  console.log('Build completed successfully')
}
