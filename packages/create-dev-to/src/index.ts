#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawn, execSync } from 'node:child_process'
import process from 'node:process'
import { randomUUID } from 'node:crypto'
import readline from 'node:readline'
import os from 'node:os'
import * as clack from '@clack/prompts'
import { red, cyan, yellow, dim } from 'kolorist'

// 与 website 一致的主题色函数
// 主绿色 (#3fb950) RGB(63, 185, 80)
// 白色 (#e6edf3) RGB(230, 237, 243)
const primaryGreen = (str: string) => `\x1b[38;2;63;185;80m${str}\x1b[0m`
const white = (str: string) => `\x1b[38;2;230;237;243m${str}\x1b[0m`
import { InstallLogger } from './installLogger.js'
import { displayInstallSummary, type InstallStats } from './visualComponents.js'

const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn', 'bun'] as const
type PackageManager = typeof PACKAGE_MANAGERS[number]

// Build-time injected values - will be replaced by esbuild
declare const __GIT_COMMIT__: string
declare const __GIT_BRANCH__: string
declare const __BUILD_TIME__: string
declare const __PACKAGE_VERSION__: string

const __BUILD_INFO__ = {
  commit: __GIT_COMMIT__,
  branch: __GIT_BRANCH__,
  buildTime: __BUILD_TIME__,
  version: __PACKAGE_VERSION__,
}

type Framework = {
  name: string
  display: string
  color: (str: string) => string
  variants: FrameworkVariant[]
}

type FrameworkVariant = {
  name: string
  display: string
  color: (str: string) => string
}

const FRAMEWORKS: Framework[] = [
  {
    name: 'react',
    display: 'React',
    color: cyan,
    variants: [
      {
        name: 'react-ts',
        display: 'TypeScript',
        color: cyan,
      },
      {
        name: 'react-compiler-ts',
        display: 'TypeScript + React Compiler',
        color: cyan,
      },
      {
        name: 'react-swc-ts',
        display: 'TypeScript + SWC',
        color: cyan,
      },
      {
        name: 'react',
        display: 'JavaScript',
        color: yellow,
      },
      {
        name: 'react-compiler',
        display: 'JavaScript + React Compiler',
        color: yellow,
      },
      {
        name: 'react-swc',
        display: 'JavaScript + SWC',
        color: yellow,
      },
    ],
  },
  {
    name: 'vue',
    display: 'Vue',
    color: primaryGreen,
    variants: [
      {
        name: 'vue-ts',
        display: 'TypeScript',
        color: primaryGreen,
      },
      {
        name: 'vue',
        display: 'JavaScript',
        color: yellow,
      },
    ],
  },
  {
    name: 'svelte',
    display: 'Svelte',
    color: red,
    variants: [],
  },
  {
    name: 'solid',
    display: 'Solid',
    color: cyan,
    variants: [],
  },
  {
    name: 'preact',
    display: 'Preact',
    color: cyan,
    variants: [],
  },
  {
    name: 'lit',
    display: 'Lit',
    color: yellow,
    variants: [],
  },
  {
    name: 'qwik',
    display: 'Qwik',
    color: cyan,
    variants: [],
  },
  {
    name: 'vanilla',
    display: 'Vanilla',
    color: yellow,
    variants: [],
  },
]

type TemplateSource = {
  name: string
  getCloneCommand: (template: string, targetDir: string, packageManager: PackageManager) => { command: string, args: string[] }
  isGitBased?: boolean
}

const TEMPLATE_SOURCES: TemplateSource[] = [
  {
    name: 'GitHub',
    getCloneCommand: (template: string, targetDir: string, packageManager: PackageManager) => {
      const pmCommand = getDegitCommandForPM(packageManager)
      return {
        command: pmCommand.command,
        args: pmCommand.args('degit', [`vitejs/vite/packages/create-vite/template-${template}`, targetDir, '--force']),
      }
    },
  },
  {
    name: 'Gitee Mirror (国内镜像)',
    isGitBased: true,
    getCloneCommand: (_template: string, targetDir: string) => ({
      command: 'git',
      args: [
        'clone',
        '--depth',
        '1',
        'https://gitee.com/mirrors/ViteJS.git',
        targetDir,
      ],
    }),
  },
] as const

const PM_CONFIGS = {
  pnpm: {
    install: 'pnpm install',
    dev: 'pnpm dev',
  },
  npm: {
    install: 'npm install',
    dev: 'npm run dev',
  },
  yarn: {
    install: 'yarn',
    dev: 'yarn dev',
  },
  bun: {
    install: 'bun install',
    dev: 'bun dev',
  },
} as const

function checkCommandExists(command: string): boolean {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' })
    return true
  }
  catch {
    return false
  }
}

function detectPackageManager(userAgent: string): PackageManager | null {
  for (const pm of PACKAGE_MANAGERS) {
    if (userAgent.includes(pm)) return pm
  }
  for (const pm of PACKAGE_MANAGERS) {
    if (checkCommandExists(pm)) return pm
  }
  return null
}

function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/\/+$/g, '')
}

function isEmpty(path: string) {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}
function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-')
}

function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') {
      continue
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
  }
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
  }
  else {
    fs.copyFileSync(src, dest)
  }
}

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' })
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(' ')} failed`))
        return
      }
      resolve()
    })
    child.on('error', reject)
  })
}

async function runWithLogger(
  command: string,
  args: string[],
  cwd: string,
  packageManager: PackageManager,
): Promise<InstallStats> {
  const logger = new InstallLogger(packageManager)

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    logger.start()

    if (child.stdout) {
      const stdoutReader = readline.createInterface({
        input: child.stdout,
        crlfDelay: Infinity,
      })
      stdoutReader.on('line', line => logger.processLine(line, 'stdout'))
    }

    if (child.stderr) {
      const stderrReader = readline.createInterface({
        input: child.stderr,
        crlfDelay: Infinity,
      })
      stderrReader.on('line', line => logger.processLine(line, 'stderr'))
    }

    child.on('close', async (code) => {
      if (code !== 0) {
        logger.error()
        reject(new Error(`${command} ${args.join(' ')} failed`))
        return
      }

      const stats = await logger.finish(cwd)
      resolve(stats)
    })

    child.on('error', (err) => {
      logger.error()
      reject(err)
    })
  })
}

function findViteConfigFile(projectDir: string): string | null {
  const candidates = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.cjs']
  for (const name of candidates) {
    const p = path.join(projectDir, name)
    if (fs.existsSync(p)) return p
  }
  return null
}

type Spinner = ReturnType<typeof clack.spinner>

type CloneResult = {
  fromCache: boolean
  commitHash: string | null
}

async function cloneViteTemplate(template: string, targetDir: string, packageManager: PackageManager, spinner: Spinner): Promise<CloneResult> {
  // Try to restore from cache first
  const cacheMetadata = getTemplateCacheMetadata(template)

  if (cacheMetadata) {
    const shortHash = cacheMetadata.commitHash.slice(0, 8)
    spinner.message(`Checking cache ${dim(`(${shortHash})`)}`)

    const cachedRestored = await restoreFromCache(template, targetDir)
    if (cachedRestored) {
      spinner.stop(`Template restored from cache ${dim(`(${shortHash})`)}`)
      return { fromCache: true, commitHash: cacheMetadata.commitHash }
    }
    spinner.message(`Downloading template ${dim('(cache outdated)')}`)
  }
  else {
    spinner.message('Downloading template')
  }

  const errors: Array<{ source: string, error: string }> = []

  for (let i = 0; i < TEMPLATE_SOURCES.length; i++) {
    const source = TEMPLATE_SOURCES[i]
    let tempTargetDir: string | null = null

    try {
      // Show which source we're trying
      if (i > 0) {
        spinner.message(`Trying ${source.name}...`)
      }

      // Get the current commit hash for cache validation
      spinner.message(`Checking template version from ${source.name}...`)
      const commitHash = getTemplateCommitHash(source, template)

      if (commitHash) {
        const shortHash = commitHash.slice(0, 8)
        spinner.message(`Latest template version: ${shortHash}`)
      }

      const { command, args } = source.getCloneCommand(template, targetDir, packageManager)

      // For git-based sources, we need special handling
      if (source.isGitBased) {
        // Create temp directory for cloning (git clone will create the target folder)
        const tempCloneDir = path.join(process.cwd(), `.tmp-clone-${randomUUID()}`)
        const cloneArgs = [...args.slice(0, -1), tempCloneDir] // Replace last arg (targetDir) with tempCloneDir

        // Stop spinner before git clone to ensure proper output formatting
        spinner.stop()

        // Clone the entire repo to temp directory
        await run(command, cloneArgs, process.cwd())

        // Restart spinner after git clone
        spinner.start('Processing template')

        try {
          // Extract the template folder from the cloned repo
          const templateSrcPath = path.join(tempCloneDir, 'packages/create-vite', `template-${template}`)

          if (!fs.existsSync(templateSrcPath)) {
            throw new Error(
              `Template not found at packages/create-vite/template-${template}. The repository structure may have changed.`,
            )
          }

          // Move the template files to a temp location with unique name
          tempTargetDir = path.join(process.cwd(), `.tmp-template-${randomUUID()}`)
          copyDir(templateSrcPath, tempTargetDir)

          // Clean up the cloned repo
          fs.rmSync(tempCloneDir, { recursive: true, force: true })

          // Move the template to the final location
          // If target exists, remove it first (fs.renameSync cannot rename to existing non-empty dir)
          if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true })
          }
          fs.renameSync(tempTargetDir, targetDir)
          tempTargetDir = null // Mark as successfully moved
        }
        catch (extractError) {
          // Clean up temp clone directory on extraction error
          if (fs.existsSync(tempCloneDir)) {
            fs.rmSync(tempCloneDir, { recursive: true, force: true })
          }
          throw extractError
        }
      }
      else {
        // For degit sources, command and args are already properly formatted
        await run(command, args, process.cwd())
      }

      // Save to cache if we got a commit hash
      if (commitHash) {
        const shortHash = commitHash.slice(0, 8)
        spinner.message(`Caching template ${dim(`(${shortHash})`)} for future use...`)
        await saveToCache(template, targetDir, commitHash)
        spinner.message(`Template cached ${dim(`(${shortHash})`)}`)
      }

      return { fromCache: false, commitHash }
    }
    catch (error) {
      // Clean up any temp directory on failure
      if (tempTargetDir && fs.existsSync(tempTargetDir)) {
        fs.rmSync(tempTargetDir, { recursive: true, force: true })
      }

      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push({ source: source.name, error: errorMsg })

      if (i < TEMPLATE_SOURCES.length - 1) {
        // Not the last source, will try next one
        // Ensure spinner is running before showing retry message
        if (source.isGitBased) {
          spinner.start(`${source.name} failed, trying ${TEMPLATE_SOURCES[i + 1].name}`)
        }
        else {
          spinner.message(`${source.name} failed, trying ${TEMPLATE_SOURCES[i + 1].name}...`)
        }
      }
      else {
        // This is the last source, throw comprehensive error
        const errorDetails = errors
          .map(e => `  • ${e.source}: ${e.error}`)
          .join('\n')
        throw new Error(
          `Failed to clone template from all sources:\n${errorDetails}\n\nPlease check your network connection or try again later.`,
        )
      }
    }
  }

  // This should never be reached due to the error handling in the loop,
  // but TypeScript needs an explicit return to satisfy the return type
  throw new Error('Unexpected end of cloneViteTemplate function')
}

function getDegitCommandForPM(pm: PackageManager): { command: string, args: (cmd: string, cmdArgs: string[]) => string[] } {
  switch (pm) {
    case 'pnpm':
      return {
        command: 'pnpx',
        args: (cmd, cmdArgs) => [cmd, ...cmdArgs],
      }
    case 'npm':
      return {
        command: 'npx',
        args: (cmd, cmdArgs) => [cmd, ...cmdArgs],
      }
    case 'yarn':
      return {
        command: 'yarn',
        args: (cmd, cmdArgs) => ['dlx', cmd, ...cmdArgs],
      }
    case 'bun':
      return {
        command: 'bunx',
        args: (cmd, cmdArgs) => [cmd, ...cmdArgs],
      }
  }
}

function getTemplateCacheDir(): string {
  const cacheDir = path.join(process.env.HOME || process.env.USERPROFILE || os.homedir(), '.create-dev-to-cache')
  return cacheDir
}

function getTemplateCommitHash(source: TemplateSource, template: string): string | null {
  try {
    if (source.name === 'GitHub') {
      // Get the latest commit hash that modified the specific template directory
      // Using GitHub API to get the last commit for the template path
      const templatePath = `packages/create-vite/template-${template}`
      const hash = execSync(
        `git ls-remote https://github.com/vitejs/vite.git HEAD | cut -f1`,
        { stdio: 'pipe' },
      )
        .toString()
        .trim()

      // Use git log to get the last commit that modified this specific template directory
      // This requires a shallow clone, so we'll use the GitHub API instead
      try {
        const apiUrl = `https://api.github.com/repos/vitejs/vite/commits?path=${templatePath}&per_page=1`
        const apiHash = execSync(
          `curl -s "${apiUrl}" | grep -m 1 '"sha"' | cut -d'"' -f4`,
          { stdio: 'pipe' },
        )
          .toString()
          .trim()
        return apiHash || hash
      }
      catch {
        // Fallback to HEAD commit if API call fails
        return hash
      }
    }
    else if (source.name === 'Gitee Mirror (国内镜像)') {
      // For Gitee mirror, get HEAD commit (Gitee API may not be as reliable)
      const hash = execSync('git ls-remote https://gitee.com/mirrors/ViteJS.git HEAD', { stdio: 'pipe' })
        .toString()
        .split('\t')[0]
        .trim()
      return hash
    }
    else {
      return null
    }
  }
  catch {
    return null
  }
}

function getTemplateCachePath(template: string, commitHash: string): string {
  const cacheDir = getTemplateCacheDir()
  const templateCacheFile = `${template}-${commitHash.slice(0, 8)}.zip`
  return path.join(cacheDir, templateCacheFile)
}

function getTemplateCacheMetadata(template: string): { commitHash: string } | null {
  const cacheDir = getTemplateCacheDir()
  const metadataFile = path.join(cacheDir, `${template}.json`)
  try {
    if (fs.existsSync(metadataFile)) {
      const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'))
      return metadata
    }
  }
  catch {
    // Ignore metadata read errors
  }
  return null
}

function saveTemplateCacheMetadata(template: string, commitHash: string): void {
  const cacheDir = getTemplateCacheDir()
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  const metadataFile = path.join(cacheDir, `${template}.json`)
  fs.writeFileSync(metadataFile, JSON.stringify({ commitHash }, null, 2))
}

async function restoreFromCache(template: string, targetDir: string): Promise<boolean> {
  try {
    const metadata = getTemplateCacheMetadata(template)
    if (!metadata) return false

    const cachePath = getTemplateCachePath(template, metadata.commitHash)
    const cacheSourceDir = path.join(path.dirname(cachePath), `${template}-${metadata.commitHash.slice(0, 8)}`)

    // Check if the cache directory exists (we store uncompressed directories for faster access)
    if (fs.existsSync(cacheSourceDir)) {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true })
      }
      copyDir(cacheSourceDir, targetDir)
      return true
    }
  }
  catch {
    // Ignore cache restore errors and fall back to download
  }
  return false
}

async function saveToCache(template: string, sourceDir: string, commitHash: string): Promise<void> {
  try {
    const cacheDir = getTemplateCacheDir()
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }

    const cachePath = getTemplateCachePath(template, commitHash)
    const cacheSourceDir = path.join(path.dirname(cachePath), `${template}-${commitHash.slice(0, 8)}`)

    // Store uncompressed directory for faster access
    if (!fs.existsSync(cacheSourceDir)) {
      copyDir(sourceDir, cacheSourceDir)
    }

    // Save metadata with the commit hash
    saveTemplateCacheMetadata(template, commitHash)
  }
  catch {
    // Ignore cache save errors, it's not critical
  }
}

function injectPluginIntoViteConfig(content: string, pluginPackage: string, pluginName: string): string {
  const hasImport = new RegExp(`['"]${pluginPackage.replace(/\//g, '\\/')}['"]`).test(content)
  const hasCall = content.includes(`${pluginName}(`)

  let out = content

  // 添加 import 语句
  if (!hasImport) {
    const importMatches = Array.from(out.matchAll(/^import .+$/gm))
    if (importMatches.length > 0) {
      const last = importMatches[importMatches.length - 1]!
      const insertPos = (last.index ?? 0) + last[0].length
      out = `${out.slice(0, insertPos)}\nimport { ${pluginName} } from '${pluginPackage}'\n${out.slice(insertPos)}`
    }
    else {
      out = `import { ${pluginName} } from '${pluginPackage}'\n${out}`
    }
  }

  // 添加插件到 plugins 数组
  if (!hasCall) {
    // 找到 plugins: [ 的位置
    const pluginsStartMatch = /plugins\s*:\s*\[/.exec(out)
    if (!pluginsStartMatch || pluginsStartMatch.index === undefined) {
      return out
    }

    const startIndex = pluginsStartMatch.index + pluginsStartMatch[0].length

    // 使用括号匹配找到对应的 ]
    let depth = 1
    let endIndex = startIndex

    for (let i = startIndex; i < out.length; i++) {
      const char = out[i]
      if (char === '[') depth++
      else if (char === ']') {
        depth--
        if (depth === 0) {
          endIndex = i
          break
        }
      }
    }

    const full = out.slice(pluginsStartMatch.index, endIndex + 1)
    const inner = out.slice(startIndex, endIndex)

    // 检查是否是多行格式
    if (inner.includes('\n')) {
      // 多行格式：找到缩进
      const lines = inner.split('\n')
      const pluginLines = lines.filter(line => line.trim() && !line.trim().startsWith('//'))

      let indent = '    ' // 默认 4 空格
      if (pluginLines.length > 0) {
        const firstPluginLine = pluginLines[0]
        const match = firstPluginLine.match(/^(\s+)/)
        if (match) indent = match[1]
      }

      // 在最后一个插件后添加新插件
      const trimmedInner = inner.trimEnd()
      const hasTrailingComma = trimmedInner.trim().endsWith(',') || trimmedInner.trim().endsWith('),')
      const newPlugin = `${indent}${pluginName}(),`

      // 找到最后一个非空白行
      const lastContentIndex = trimmedInner.lastIndexOf('\n')
      if (lastContentIndex === -1) {
        // 单行但包含换行符的情况
        out = out.replace(full, `plugins: [\n${newPlugin}\n  ]`)
      }
      else {
        const beforeLast = trimmedInner.slice(0, lastContentIndex + 1)
        const lastLine = trimmedInner.slice(lastContentIndex + 1)

        if (!hasTrailingComma && lastLine.trim()) {
          // 最后一行没有逗号，需要添加
          out = out.replace(full, `plugins: [${beforeLast}${lastLine},\n${newPlugin}\n  ]`)
        }
        else {
          // 最后一行有逗号或为空
          out = out.replace(full, `plugins: [${trimmedInner}\n${newPlugin}\n  ]`)
        }
      }
    }
    else {
      // 单行格式
      const compactInner = inner.trim()
      const nextInner = compactInner ? `${compactInner}, ${pluginName}()` : `${pluginName}()`
      out = out.replace(full, `plugins: [${nextInner}]`)
    }
  }

  return out
}

function updatePluginComponentName(
  content: string,
  pluginName: string,
  componentName: string,
  projectName: string,
  componentEntry?: string,
): string {
  // 生成默认组件名称（与项目名称转换逻辑保持一致）
  const defaultComponentName = projectName
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')

  const pluginCall = `${pluginName}()`

  // 如果组件名称与默认名称相同，使用字符串简写形式
  if (componentName === defaultComponentName) {
    const newPluginCall = `${pluginName}('${componentName}')`
    if (content.includes(pluginCall)) {
      return content.replace(pluginCall, newPluginCall)
    }
    return content
  }

  // 否则，使用对象配置形式 devToReactPlugin({ [ComponentName]: 'src/[ComponentName]/index.tsx' })
  const entryPath = componentEntry || `src/${componentName}/index.tsx`
  const newPluginCall = `${pluginName}({
      ${componentName}: '${entryPath}',
    })`

  // 检查 pluginCall 是否存在
  if (content.includes(pluginCall)) {
    return content.replace(pluginCall, newPluginCall)
  }

  return content
}

function editFile(file: string, callback: (content: string) => string) {
  const content = fs.readFileSync(file, 'utf-8')
  fs.writeFileSync(file, callback(content), 'utf-8')
}

const DEVTO_LOGO_SVG = `
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><rect width="128" height="128" rx="24" fill="#0D1117"/><text x="64" y="64" fill="#3FB950" font-family="Arial,sans-serif" font-size="104" font-weight="700" text-anchor="middle" dominant-baseline="central">Ɖ</text></svg>
`

function ensureDevtoLogo(root: string) {
  const assetsDir = path.join(root, 'src', 'assets')
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true })
  }
  const logoPath = path.join(assetsDir, 'devto.svg')
  fs.writeFileSync(logoPath, DEVTO_LOGO_SVG, 'utf-8')
}

function updateAppTemplate(root: string, componentName: string, isTs: boolean) {
  const appPath = path.join(root, 'src', `App.${isTs ? 'tsx' : 'jsx'}`)
  if (!fs.existsSync(appPath)) {
    return
  }

  const appContent = `import styles from './App.module.css'
import ${componentName} from './${componentName}/index'

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.appHeader}>
        <span className={styles.eyebrow}>dev-to template</span>
        <h1>Component preview</h1>
        <p className={styles.subtitle}>
          Vite dev server with <code className={styles.appCode}>@dev-to/react-plugin</code>
        </p>
      </header>

      <section className={styles.preview}>
        <div className={styles.previewInner}>
          <${componentName} />
        </div>
      </section>

    </div>
  )
}
`
  fs.writeFileSync(appPath, appContent, 'utf-8')

  const appCssPath = path.join(root, 'src', 'App.module.css')
  const appCssContent = `.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  text-align: center;
}

.appHeader {
  max-width: 720px;
}

.appHeader h1 {
  margin: 4px 0 6px;
  font-size: 34px;
  line-height: 1.15;
  text-wrap: balance;
}

.eyebrow {
  display: inline-block;
  font-size: 10px;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.subtitle {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  text-wrap: balance;
  color: rgba(255, 255, 255, 0.72);
}

.preview {
  width: min(960px, 100%);
  padding: 1px;
  border-radius: calc(var(--border-radius, 25px) + 1px);
  background: linear-gradient(130deg, #22d3ee, #38bdf8 35%, #34d399 70%, #fbbf24);
}

.previewInner {
  border-radius: var(--border-radius, 25px);
  padding: 28px 20px;
  background: rgba(15, 23, 42, 0.85);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35);
}

.appFooter {
  margin: 0;
  font-size: 12px;
  text-wrap: balance;
  color: rgba(255, 255, 255, 0.6);
}

.appCode {
  background: rgba(255, 255, 255, 0.12);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}

@media (prefers-color-scheme: dark) {
  .appHeader h1 {
    color: #f8fafc;
  }

  .previewInner {
    background: #0b1220;
    border: 1px solid rgba(148, 163, 184, 0.18);
    box-shadow: 0 18px 50px rgba(2, 6, 23, 0.65);
  }

  .subtitle {
    color: rgba(226, 232, 240, 0.78);
  }

  .appCode {
    background: rgba(148, 163, 184, 0.16);
  }
}

@media (prefers-color-scheme: light) {
  .eyebrow {
    color: #6b7280;
  }

  .subtitle {
    color: #4b5563;
  }

  .previewInner {
    background: #ffffff;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
  }

  .appFooter {
    color: #6b7280;
  }

  .appCode {
    background: #e2e8f0;
  }
}

@media (max-width: 640px) {
  .previewInner {
    padding: 24px 16px;
  }

  .appHeader h1 {
    font-size: 30px;
  }
}

@media (max-width: 360px) {
  .app {
    gap: 24px;
  }

  .appHeader h1 {
    font-size: 26px;
  }

  .eyebrow {
    font-size: 9px;
    letter-spacing: 1.4px;
  }

  .subtitle {
    font-size: 12px;
  }

  .previewInner {
    padding: 20px 12px;
  }

  .appFooter {
    font-size: 11px;
  }

  .appCode {
    font-size: 10px;
  }
}
`
  fs.writeFileSync(appCssPath, appCssContent, 'utf-8')
}

function updateVueAppTemplate(root: string, componentName: string, isTs: boolean) {
  const appPath = path.join(root, 'src', 'App.vue')
  if (!fs.existsSync(appPath)) {
    return
  }

  const scriptLang = isTs ? ' lang="ts"' : ''
  const appContent = `<script setup${scriptLang}>
import ${componentName} from './${componentName}/index.vue'
</script>

<template>
  <div class="app">
    <header class="appHeader">
      <span class="eyebrow">dev-to template</span>
      <h1>Component preview</h1>
      <p class="subtitle">
        Vite dev server with <code class="appCode">@dev-to/vue-plugin</code>
      </p>
    </header>

    <section class="preview">
      <div class="previewInner">
        <${componentName} />
      </div>
    </section>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  text-align: center;
}

.appHeader {
  max-width: 720px;
}

.appHeader h1 {
  margin: 4px 0 6px;
  font-size: 32px;
  line-height: 1.2;
}

.eyebrow {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #4b5563;
}

.subtitle {
  font-size: 13px;
  color: #6b7280;
}

.appCode {
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 12px;
}

.preview {
  width: min(720px, 94vw);
}

.previewInner {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 28px 22px;
}
</style>
`

  fs.writeFileSync(appPath, appContent, 'utf-8')
}

function createComponentFile(root: string, componentName: string, isTs: boolean) {
  const componentDir = path.join(root, 'src', componentName)
  const componentFile = path.join(componentDir, `index.${isTs ? 'tsx' : 'jsx'}`)

  // 创建组件目录
  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true })
  }

  // 生成组件内容
  const componentFileName = `index.${isTs ? 'tsx' : 'jsx'}`
  const componentContent = isTs
    ? `import { useState } from 'react'
import devtoLogo from '../assets/devto.svg'
import reactLogo from '../assets/react.svg'
import viteLogo from '/vite.svg'
import styles from './index.module.css'

export interface ${componentName}Props {
  title?: string
}

export default function ${componentName}(props: ${componentName}Props) {
  const [count, setCount] = useState(0)
  const title = props.title || 'ƉevTo + Vite + React'

  return (
    <div className={styles.component}>
      <div className={styles.logoRow}>
        <a href="https://github.com/YangYongAn/dev-to" target="_blank" rel="noreferrer">
          <img src={devtoLogo} className={styles.logoDevto} alt="dev-to logo" />
        </a>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className={styles.logo} alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className={styles.logoReact} alt="React logo" />
        </a>
      </div>
      <h1>{title}</h1>
      <p className={styles.subtitle}>
        <span>Remote component served by</span>
        <code className={styles.code}>@dev-to/react-plugin</code>
      </p>
      <div className={styles.counterCard}>
        <button onClick={() => setCount(count => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code className={styles.code}>src/${componentName}/${componentFileName}</code> to test HMR
        </p>
      </div>
      <p className={styles.readTheDocs}>
        Click on the ƉevTo, Vite, and React logos to learn more
      </p>
    </div>
  )
}
`
    : `import { useState } from 'react'
import devtoLogo from '../assets/devto.svg'
import reactLogo from '../assets/react.svg'
import viteLogo from '/vite.svg'
import styles from './index.module.css'

export default function ${componentName}(props) {
  const [count, setCount] = useState(0)
  const title = props.title || 'ƉevTo + Vite + React'

  return (
    <div className={styles.component}>
      <div className={styles.logoRow}>
        <a href="https://github.com/YangYongAn/dev-to" target="_blank" rel="noreferrer">
          <img src={devtoLogo} className={styles.logoDevto} alt="dev-to logo" />
        </a>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className={styles.logo} alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className={styles.logoReact} alt="React logo" />
        </a>
      </div>
      <h1>{title}</h1>
      <p className={styles.subtitle}>
        <span>Remote component served by</span>
        <code className={styles.code}>@dev-to/react-plugin</code>
      </p>
      <div className={styles.counterCard}>
        <button onClick={() => setCount(count => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code className={styles.code}>src/${componentName}/${componentFileName}</code> to test HMR
        </p>
      </div>
      <p className={styles.readTheDocs}>
        Click on the ƉevTo, Vite, and React logos to learn more
      </p>
    </div>
  )
}
`

  // 生成样式文件
  const styleContent = `.component {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px 12px 28px;
  text-align: center;
}

.logoRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 18px;
}

.logo {
  height: 48px;
  padding: 0;
  will-change: filter, transform;
  transition: transform 0.25s ease, filter 0.25s ease;
}

.logoDevto {
  height: 48px;
  padding: 0;
  will-change: filter, transform;
  transition: transform 0.25s ease, filter 0.25s ease;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.35);
}

.logoReact {
  height: 48px;
  padding: 0;
  will-change: filter, transform;
  transition: transform 0.25s ease, filter 0.25s ease;
}

.logo:hover {
  filter: drop-shadow(0 0 18px rgba(56, 189, 248, 0.6));
}

.logoDevto:hover {
  filter: drop-shadow(0 0 18px rgba(63, 185, 80, 0.6));
}

.logoReact:hover {
  filter: drop-shadow(0 0 18px rgba(97, 218, 251, 0.65));
}

.component h1 {
  margin: 12px 0 6px;
  font-size: 28px;
  line-height: 1.1;
  white-space: nowrap;
}

.subtitle {
  margin: 0 auto 18px;
  max-width: 500px;
  font-size: 13px;
  line-height: 1.5;
  text-wrap: balance;
  color: rgba(255, 255, 255, 0.72);
}

.subtitle span {
  display: block;
}

.subtitle code {
  display: inline-block;
  margin-top: 4px;
}

.counterCard {
  margin: 18px auto;
  padding: 20px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(6px);
}

.counterCard p {
  margin: 18px 0;
  font-size: 10px;
  white-space: nowrap;
}

.counterCard button {
  border: 1px solid rgba(63, 185, 80, 0.45);
  border-radius: 999px;
  padding: 9px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #3fb950, #22c55e 55%, #16a34a);
  box-shadow: 0 10px 20px rgba(22, 163, 74, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.counterCard button:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(22, 163, 74, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  filter: brightness(1.03);
}

.counterCard button:active {
  transform: translateY(0);
}

.counterCard button:focus-visible {
  outline: 3px solid rgba(63, 185, 80, 0.35);
  outline-offset: 3px;
}

.readTheDocs {
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
  text-wrap: balance;
}

.code {
  background: rgba(255, 255, 255, 0.12);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}

@keyframes logoSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .logoReact {
    animation: logoSpin infinite 20s linear;
  }
}

@media (prefers-color-scheme: dark) {
  .component h1 {
    color: #f8fafc;
  }

  .logoDevto {
    border: 1px solid rgba(63, 185, 80, 0.35);
    box-shadow: 0 10px 26px rgba(2, 6, 23, 0.55);
  }

  .subtitle {
    color: rgba(226, 232, 240, 0.8);
  }

  .counterCard {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(148, 163, 184, 0.25);
  }

  .counterCard p {
    color: rgba(226, 232, 240, 0.82);
  }

  .readTheDocs {
    color: rgba(148, 163, 184, 0.75);
  }

  .code {
    background: rgba(148, 163, 184, 0.18);
  }
}

@media (prefers-color-scheme: light) {
  .subtitle {
    color: #4b5563;
  }

  .counterCard {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  .counterCard button {
    color: #ffffff;
    box-shadow: 0 10px 18px rgba(15, 23, 42, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .readTheDocs {
    color: #6b7280;
  }

  .code {
    background: #e2e8f0;
  }
}

@media (max-width: 360px) {
  .component {
    padding: 18px 10px 24px;
  }

  .logoRow {
    gap: 8px;
    margin-bottom: 14px;
  }

  .logo {
    height: 40px;
  }

  .logoDevto {
    height: 40px;
  }

  .logoReact {
    height: 40px;
  }

  .component h1 {
    font-size: 28px;
  }

  .subtitle {
    font-size: 12px;
  }

  .counterCard {
    padding: 18px 16px;
  }

  .counterCard button {
    padding: 8px 20px;
    font-size: 13px;
  }

  .readTheDocs {
    font-size: 11px;
  }
}
`

  // 写入文件
  fs.writeFileSync(componentFile, componentContent, 'utf-8')
  fs.writeFileSync(path.join(componentDir, 'index.module.css'), styleContent, 'utf-8')
}

function createVueComponentFile(root: string, componentName: string, isTs: boolean) {
  const componentDir = path.join(root, 'src', componentName)
  const componentFile = path.join(componentDir, 'index.vue')

  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true })
  }

  const scriptLang = isTs ? ' lang="ts"' : ''
  const propsDecl = isTs
    ? 'const props = defineProps<{ title?: string }>()'
    : 'const props = defineProps({ title: String })'

  const componentContent = `<script setup${scriptLang}>
import { computed, ref } from 'vue'
import devtoLogo from '../assets/devto.svg'
import vueLogo from '../assets/vue.svg'
import viteLogo from '/vite.svg'

${propsDecl}
const count = ref(0)
const title = computed(() => props.title || 'DevTo + Vite + Vue')
</script>

<template>
  <div class="component">
    <div class="logoRow">
      <a href="https://github.com/YangYongAn/dev-to" target="_blank" rel="noreferrer">
        <img :src="devtoLogo" class="logoDevto" alt="dev-to logo" />
      </a>
      <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
        <img :src="viteLogo" class="logo" alt="Vite logo" />
      </a>
      <a href="https://vuejs.org" target="_blank" rel="noreferrer">
        <img :src="vueLogo" class="logoVue" alt="Vue logo" />
      </a>
    </div>
    <h1>{{ title }}</h1>
    <p class="subtitle">
      Remote component served by <code class="code">@dev-to/vue-plugin</code>
    </p>
    <div class="counterCard">
      <button type="button" @click="count += 1">
        count is {{ count }}
      </button>
      <p>
        Edit <code class="code">src/${componentName}/index.vue</code> to test HMR
      </p>
    </div>
  </div>
</template>

<style scoped>
.component {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px 12px 28px;
  text-align: center;
}

.logoRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 18px;
}

.logo,
.logoDevto,
.logoVue {
  height: 48px;
}

.logoDevto {
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.35);
}

.subtitle {
  margin: 8px auto 18px;
  max-width: 520px;
  font-size: 13px;
  color: #6b7280;
}

.counterCard {
  margin: 18px auto;
  padding: 20px 18px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.counterCard button {
  border: 1px solid rgba(15, 118, 110, 0.5);
  border-radius: 999px;
  padding: 8px 22px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #10b981, #0ea5a0 55%, #0d9488);
  cursor: pointer;
}

.counterCard p {
  margin: 14px 0 0;
  font-size: 11px;
  color: #64748b;
}

.code {
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}
</style>
`

  fs.writeFileSync(componentFile, componentContent, 'utf-8')
}

function setupReactSWC(root: string, isTs: boolean) {
  editFile(path.join(root, 'package.json'), (content) => {
    return content.replace(
      /"@vitejs\/plugin-react": ".+?"/,
      '"@vitejs/plugin-react-swc": "^4.2.2"',
    )
  })
  editFile(path.join(root, `vite.config.${isTs ? 'ts' : 'js'}`), (content) => {
    return content.replace('@vitejs/plugin-react', '@vitejs/plugin-react-swc')
  })
}

function setupReactCompiler(root: string, isTs: boolean) {
  editFile(path.join(root, 'package.json'), (content) => {
    const asObject = JSON.parse(content)
    const devDepsEntries = Object.entries(asObject.devDependencies || {})
    devDepsEntries.push(['babel-plugin-react-compiler', '^1.0.0'])
    devDepsEntries.sort()
    asObject.devDependencies = Object.fromEntries(devDepsEntries)
    return JSON.stringify(asObject, null, 2) + '\n'
  })
  editFile(path.join(root, `vite.config.${isTs ? 'ts' : 'js'}`), (content) => {
    // 如果已经有 babel-plugin-react-compiler，跳过
    if (content.includes('babel-plugin-react-compiler')) {
      return content
    }

    // 简单替换 react() 为带有 babel 配置的版本
    return content.replace(
      /react\(\)/,
      `react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    })`,
    )
  })
}

function printBanner() {
  const version = __BUILD_INFO__.version
  const commit = __BUILD_INFO__.commit
  const branch = __BUILD_INFO__.branch

  // Convert UTC build time to local time for display
  const buildTimeUTC = __BUILD_INFO__.buildTime
  const [date, time] = buildTimeUTC.split(' ')
  const utcDateTime = new Date(`${date}T${time}:00Z`)
  const year = utcDateTime.getFullYear()
  const month = String(utcDateTime.getMonth() + 1).padStart(2, '0')
  const day = String(utcDateTime.getDate()).padStart(2, '0')
  const hours = String(utcDateTime.getHours()).padStart(2, '0')
  const minutes = String(utcDateTime.getMinutes()).padStart(2, '0')
  const localTime = `${year}-${month}-${day} ${hours}:${minutes}`

  // 使用主题色的 logo：DEV 用绿色，TO 用白色
  const logo = `
${primaryGreen('  ██████╗ ███████╗██╗   ██╗')}    ${white('████████╗ ██████╗')}    ${primaryGreen(`Ɖev`)}${white(`-to v${version}`)}
${primaryGreen('  ██╔══██╗██╔════╝██║   ██║')}    ${white('╚══██╔══╝██╔═══██╗')}   ${dim(`${commit === 'unknown' ? '' : `${commit} on ${branch}`}`)}
${primaryGreen('  ╬Ɖ╬  ██║█████╗  ██║   ██║')}       ${white('██║   ██║   ██║')}   ${dim(`${localTime}`)}
${primaryGreen('  ██║  ██║██╔══╝  ╚██╗ ██╔╝')}       ${white('██║   ██║   ██║')}
${primaryGreen('  ██████╔╝███████╗ ╚████╔╝')}        ${white('██║   ╚██████╔╝')}
${primaryGreen('  ╚═════╝ ╚══════╝  ╚═══╝')}         ${white('╚═╝    ╚═════╝')}
  `
  console.log(logo)
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

async function init() {
  const userAgent = process.env.npm_config_user_agent || ''
  let packageManager = detectPackageManager(userAgent)

  printBanner()

  const cwd = process.cwd()
  const argTargetDir = formatTargetDir(process.argv[2])

  let targetDir = argTargetDir || '.'

  const getProjectName = () =>
    targetDir === '.' ? path.basename(path.resolve()) : targetDir

  // 项目名称
  const project = await clack.group(
    {
      projectName: () =>
        clack.text({
          message: `Project name ${dim('\n│    Directory where your project will be created.\n')}`,
          placeholder: 'dev-to-app',
          initialValue: argTargetDir,
          defaultValue: argTargetDir || 'dev-to-app',
        }),
      shouldOverwrite: ({ results }) => {
        targetDir = formatTargetDir(results.projectName) || 'dev-to-app'
        const root = path.join(cwd, targetDir)

        if (!fs.existsSync(root)) {
          return Promise.resolve(false)
        }

        if (isEmpty(root)) {
          return Promise.resolve(false)
        }

        return clack.confirm({
          message:
            targetDir === '.'
              ? 'Current directory is not empty. Remove existing files and continue?'
              : `Target directory "${targetDir}" is not empty. Remove existing files and continue?`,
        })
      },
      componentName: ({ results }) => {
        // Convert project name to PascalCase for component name
        const projectName = results.projectName || 'dev-to-app'
        const defaultComponentName = projectName
          .split(/[-_\s]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('')

        return clack.text({
          message: `First component name ${dim('\n│    Leave blank to default to project name.You can modify it in vite config later.\n')}`,
          placeholder: defaultComponentName,
          defaultValue: defaultComponentName,
        })
      },
    },
    {
      onCancel: () => {
        clack.cancel('Operation cancelled.')
        process.exit(0)
      },
    },
  )

  const { shouldOverwrite, componentName, projectName } = project

  // 覆盖目录
  if (shouldOverwrite) {
    emptyDir(path.join(cwd, targetDir))
  }

  // 包管理器选择
  if (!packageManager) {
    const pmChoice = await clack.select({
      message: 'Select a package manager:',
      options: PACKAGE_MANAGERS.map(pm => ({
        value: pm,
        label: pm,
      })),
    })

    if (clack.isCancel(pmChoice)) {
      clack.cancel('Operation cancelled.')
      process.exit(0)
    }

    packageManager = pmChoice as PackageManager
  }

  // 框架选择
  const selectedFramework = await clack.select({
    message: 'Select a framework:',
    options: FRAMEWORKS.map(fw => ({
      value: fw,
      label: fw.variants.length > 0 ? fw.color(fw.display) : `${fw.color(fw.display)} ${dim('(Coming soon)')}`,
      hint: fw.variants.length > 0 ? undefined : 'Not yet supported',
    })),
    initialValue: FRAMEWORKS[0],
  })

  if (clack.isCancel(selectedFramework)) {
    clack.cancel('Operation cancelled.')
    process.exit(0)
  }

  // 检查框架是否支持
  if (selectedFramework.variants.length === 0) {
    clack.outro(yellow(`⚠️  ${selectedFramework.display} support is coming soon!`))
    clack.note(
      `We're working hard to add support for ${selectedFramework.display}.\n\nFor now, please use React or stay tuned for updates!`,
      'Roadmap',
    )
    process.exit(0)
  }

  // 变体选择（TypeScript/JavaScript/SWC/Compiler 等）
  const variant = await clack.select({
    message: 'Select a variant:',
    options: selectedFramework.variants.map(v => ({
      value: v.name,
      label: v.color(v.display),
    })),
  })

  if (clack.isCancel(variant)) {
    clack.cancel('Operation cancelled.')
    process.exit(0)
  }

  let template = variant as string

  const root = path.join(cwd, targetDir)

  const spinner = clack.spinner()
  spinner.start('Scaffolding project')

  // 检测是否需要 SWC 或 React Compiler（从模板名称中提取）
  let isReactSwc = false
  if (template.includes('-swc')) {
    isReactSwc = true
    template = template.replace('-swc', '')
  }
  let isReactCompiler = false
  if (template.includes('-compiler')) {
    isReactCompiler = true
    template = template.replace('-compiler', '')
  }

  // 使用 degit 克隆模板
  const cloneResult = await cloneViteTemplate(template, root, packageManager, spinner)

  // 修改 package.json 名称
  const pkgPath = path.join(root, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.name = toValidPackageName(getProjectName())
  pkg.scripts = pkg.scripts ?? {}
  if (!pkg.scripts['build:lib'] && (selectedFramework.name === 'react' || selectedFramework.name === 'vue')) {
    pkg.scripts['build:lib'] = 'dev-to build'
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  const isTs = template.includes('ts')
  const isVue = selectedFramework.name === 'vue'

  if (!isVue) {
    if (isReactSwc) {
      spinner.message('Setting up SWC...')
      setupReactSWC(root, isTs)
    }
    if (isReactCompiler) {
      spinner.message('Setting up React Compiler...')
      setupReactCompiler(root, isTs)
    }
  }

  const pluginPackage = isVue ? '@dev-to/vue-plugin' : '@dev-to/react-plugin'
  const pluginName = isVue ? 'devToVuePlugin' : 'devToReactPlugin'

  spinner.message(`Adding ${pluginPackage}`)

  // 添加插件依赖
  addDevDependency(root, pluginPackage, 'latest')

  // 注入插件到 vite.config
  const viteConfigPath = findViteConfigFile(root)
  if (viteConfigPath) {
    let patched = fs.readFileSync(viteConfigPath, 'utf-8')
    patched = injectPluginIntoViteConfig(patched, pluginPackage, pluginName)
    const componentEntry = isVue
      ? `src/${componentName}/index.vue`
      : `src/${componentName}/index.${isTs ? 'tsx' : 'jsx'}`
    patched = updatePluginComponentName(
      patched,
      pluginName,
      componentName as string,
      projectName as string,
      componentEntry,
    )
    fs.writeFileSync(viteConfigPath, patched)
  }

  spinner.message('Updating template files...')
  ensureDevtoLogo(root)
  if (isVue) {
    updateVueAppTemplate(root, componentName as string, isTs)
  }
  else {
    updateAppTemplate(root, componentName as string, isTs)
  }

  // 创建组件文件
  spinner.message(`Creating component ${componentName}...`)
  if (isVue) {
    createVueComponentFile(root, componentName as string, isTs)
  }
  else {
    createComponentFile(root, componentName as string, isTs)
  }

  // 显示项目创建完成的消息，包含缓存信息
  let completionMessage = 'Project created'
  if (cloneResult.commitHash) {
    const shortHash = cloneResult.commitHash.slice(0, 8)
    if (cloneResult.fromCache) {
      completionMessage += ` ${dim(`with cached template (${shortHash})`)}`
    }
    else {
      completionMessage += ` ${dim(`(${shortHash})`)}`
    }
  }
  spinner.stop(completionMessage)

  // 询问是否立即安装
  const shouldInstall = await clack.confirm({
    message: 'Install dependencies and start dev server?',
    initialValue: true,
  })

  if (clack.isCancel(shouldInstall)) {
    clack.cancel('Operation cancelled.')
    process.exit(0)
  }

  if (shouldInstall) {
    try {
      const stats = await runWithLogger(packageManager, ['install'], root, packageManager)

      displayInstallSummary(stats)

      clack.log.info('Starting dev server...')

      const devArgs = packageManager === 'npm' ? ['run', 'dev'] : ['dev']
      spawn(packageManager, devArgs, { cwd: root, stdio: 'inherit' })
    }
    catch (error) {
      clack.log.error('Installation failed')
      throw error
    }
  }
  else {
    const pkgManager = packageManager || 'npm'
    const cdPath = targetDir !== '.' ? `cd ${targetDir}` : null
    const installCmd = PM_CONFIGS[pkgManager].install
    const devCmd = PM_CONFIGS[pkgManager].dev

    const nextSteps = [cdPath, installCmd, devCmd].filter(Boolean).join('\n  ')

    clack.note(nextSteps, 'Next steps')
    clack.outro('Done')
  }
}

init().catch((e) => {
  clack.log.error(red(e.message || e))
  process.exit(1)
})
