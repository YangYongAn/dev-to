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
    variants: [],
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

function updatePluginComponentName(content: string, pluginName: string, componentName: string, projectName: string): string {
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
  const newPluginCall = `${pluginName}({
      ${componentName}: 'src/${componentName}/index.tsx',
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

function createComponentFile(root: string, componentName: string, isTs: boolean) {
  const componentDir = path.join(root, 'src', componentName)
  const componentFile = path.join(componentDir, `index.${isTs ? 'tsx' : 'jsx'}`)

  // 创建组件目录
  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true })
  }

  // 生成组件内容
  const componentContent = isTs
    ? `import { useState } from 'react'
import './index.css'

export interface ${componentName}Props {
  title?: string
}

export default function ${componentName}(props: ${componentName}Props) {
  const [count, setCount] = useState(0)

  return (
    <div className="${componentName.toLowerCase()}-container">
      <h1>{props.title || 'Hello from ${componentName}'}</h1>
      <div className="card">
        <button onClick={() => setCount(count => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/${componentName}/index.tsx</code> to test HMR
        </p>
      </div>
      <p className="info">
        This component is loaded remotely via <code>@dev-to/react-loader</code>
      </p>
    </div>
  )
}
`
    : `import { useState } from 'react'
import './index.css'

export default function ${componentName}(props) {
  const [count, setCount] = useState(0)

  return (
    <div className="${componentName.toLowerCase()}-container">
      <h1>{props.title || 'Hello from ${componentName}'}</h1>
      <div className="card">
        <button onClick={() => setCount(count => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/${componentName}/index.jsx</code> to test HMR
        </p>
      </div>
      <p className="info">
        This component is loaded remotely via <code>@dev-to/react-loader</code>
      </p>
    </div>
  )
}
`

  // 生成样式文件
  const styleContent = `.${componentName.toLowerCase()}-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.${componentName.toLowerCase()}-container h1 {
  font-size: 3.2em;
  line-height: 1.1;
  margin-bottom: 2rem;
}

.card {
  padding: 2em;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin: 2rem 0;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  color: white;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

.info {
  color: #888;
  font-size: 0.9em;
  margin-top: 2rem;
}

code {
  background-color: #f0f0f0;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

@media (prefers-color-scheme: dark) {
  .card {
    background-color: #2a2a2a;
  }

  code {
    background-color: #3a3a3a;
  }
}
`

  // 写入文件
  fs.writeFileSync(componentFile, componentContent, 'utf-8')
  fs.writeFileSync(path.join(componentDir, 'index.css'), styleContent, 'utf-8')
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
  if (!pkg.scripts['build:lib']) {
    pkg.scripts['build:lib'] = 'vite build --mode lib'
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  // 处理 SWC 和 React Compiler 配置
  const isTs = template.includes('ts')
  if (isReactSwc) {
    spinner.message('Setting up SWC...')
    setupReactSWC(root, isTs)
  }
  if (isReactCompiler) {
    spinner.message('Setting up React Compiler...')
    setupReactCompiler(root, isTs)
  }

  spinner.message('Adding @dev-to/react-plugin')

  // 添加插件依赖
  const pluginPackage = '@dev-to/react-plugin'
  const pluginName = 'devToReactPlugin'
  addDevDependency(root, pluginPackage, 'latest')

  // 注入插件到 vite.config
  const viteConfigPath = findViteConfigFile(root)
  if (viteConfigPath) {
    let patched = fs.readFileSync(viteConfigPath, 'utf-8')
    patched = injectPluginIntoViteConfig(patched, pluginPackage, pluginName)
    patched = updatePluginComponentName(patched, pluginName, componentName as string, projectName as string)
    fs.writeFileSync(viteConfigPath, patched)
  }

  // 创建组件文件
  spinner.message(`Creating component ${componentName}...`)
  createComponentFile(root, componentName as string, isTs)

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
