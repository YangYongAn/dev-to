#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawn, execSync } from 'node:child_process'
import process from 'node:process'
import { randomUUID } from 'node:crypto'
import readline from 'node:readline'
import * as clack from '@clack/prompts'
import { red, cyan, yellow, green, dim } from 'kolorist'
import { InstallLogger } from './installLogger.js'
import { displayInstallSummary, type InstallStats } from './visualComponents.js'

const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn', 'bun'] as const
type PackageManager = typeof PACKAGE_MANAGERS[number]

const FRAMEWORKS = [
  {
    name: 'react',
    display: 'React',
    color: cyan,
    supported: true,
  },
  {
    name: 'vue',
    display: 'Vue',
    color: green,
    supported: false,
  },
  {
    name: 'svelte',
    display: 'Svelte',
    color: red,
    supported: false,
  },
  {
    name: 'solid',
    display: 'Solid',
    color: cyan,
    supported: false,
  },
  {
    name: 'preact',
    display: 'Preact',
    color: cyan,
    supported: false,
  },
  {
    name: 'lit',
    display: 'Lit',
    color: yellow,
    supported: false,
  },
  {
    name: 'qwik',
    display: 'Qwik',
    color: cyan,
    supported: false,
  },
  {
    name: 'vanilla',
    display: 'Vanilla',
    color: yellow,
    supported: false,
  },
] as const

const REACT_TEMPLATES = [
  {
    name: 'react-ts',
    display: 'TypeScript',
    color: cyan,
  },
  {
    name: 'react',
    display: 'JavaScript',
    color: yellow,
  },
] as const

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

async function cloneViteTemplate(template: string, targetDir: string, packageManager: PackageManager, spinner: Spinner) {
  const errors: Array<{ source: string, error: string }> = []

  for (let i = 0; i < TEMPLATE_SOURCES.length; i++) {
    const source = TEMPLATE_SOURCES[i]
    let tempTargetDir: string | null = null

    try {
      // Show which source we're trying
      if (i > 0) {
        spinner.message(`Trying ${source.name}...`)
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

      return
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
    // 匹配 plugins: [...] 或 plugins:[...]
    const pluginsRegex = /plugins\s*:\s*\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\]/
    const m = pluginsRegex.exec(out)

    if (m && m.index !== undefined) {
      const full = m[0]
      const inner = m[1] || ''

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
        const hasTrailingComma = trimmedInner.trim().endsWith(',')
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
  }

  return out
}

function updatePluginComponentName(content: string, pluginName: string, componentName: string): string {
  // 匹配 devToReactPlugin() 的调用，替换为 devToReactPlugin({ [ComponentName]: 'src/[ComponentName]/index.tsx' })
  const pluginCall = `${pluginName}()`
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
    return content.replace(
      '  plugins: [react()],',
      `  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],`,
    )
  })
}

function getPackageVersion(): string {
  try {
    const pkgPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    return pkg.version || 'unknown'
  }
  catch {
    return 'unknown'
  }
}

function getGitInfo(): { commit: string, branch: string } {
  try {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
    return { commit, branch }
  }
  catch {
    return { commit: 'unknown', branch: 'unknown' }
  }
}

function printVersionInfo() {
  const version = getPackageVersion()
  const { commit, branch } = getGitInfo()
  const buildTime = new Date().toISOString().split('T')[0]

  clack.log.message(dim(`create-dev-to v${version} (${commit} on ${branch}) - ${buildTime}`))
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

  clack.intro(cyan('create-dev-to'))
  printVersionInfo()

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

  const { shouldOverwrite, componentName } = project

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
  const framework = await clack.select({
    message: 'Select a framework:',
    options: FRAMEWORKS.map(fw => ({
      value: fw.name,
      label: fw.supported ? fw.color(fw.display) : `${fw.color(fw.display)} ${dim('(Coming soon)')}`,
      hint: fw.supported ? undefined : 'Not yet supported',
    })),
    initialValue: 'react',
  })

  if (clack.isCancel(framework)) {
    clack.cancel('Operation cancelled.')
    process.exit(0)
  }

  // 检查框架是否支持
  const selectedFramework = FRAMEWORKS.find(fw => fw.name === framework)
  if (!selectedFramework?.supported) {
    clack.outro(yellow(`⚠️  ${selectedFramework?.display} support is coming soon!`))
    clack.note(
      `We're working hard to add support for ${selectedFramework?.display}.\n\nFor now, please use React or stay tuned for updates!`,
      'Roadmap',
    )
    process.exit(0)
  }

  // React 模板选择
  const variant = await clack.select({
    message: 'Select a variant:',
    options: REACT_TEMPLATES.map(template => ({
      value: template.name,
      label: template.color(template.display),
    })),
  })

  if (clack.isCancel(variant)) {
    clack.cancel('Operation cancelled.')
    process.exit(0)
  }

  const template = variant as string

  // 询问是否使用 SWC
  const shouldUseSWC = await clack.confirm({
    message: 'Use SWC for faster transpilation? (Optional)',
    initialValue: false,
  })

  if (clack.isCancel(shouldUseSWC)) {
    clack.cancel('Operation cancelled.')
    process.exit(0)
  }

  // 询问是否使用 React Compiler
  const shouldUseReactCompiler = await clack.confirm({
    message: 'Use React Compiler? (Experimental)',
    initialValue: false,
  })

  if (clack.isCancel(shouldUseReactCompiler)) {
    clack.cancel('Operation cancelled.')
    process.exit(0)
  }

  // 询问是否使用 Rolldown（实验性）
  const shouldUseRolldown = await clack.confirm({
    message: 'Use Rolldown for bundling? (Experimental)',
    initialValue: false,
  })

  if (clack.isCancel(shouldUseRolldown)) {
    clack.cancel('Operation cancelled.')
    process.exit(0)
  }

  const root = path.join(cwd, targetDir)

  const spinner = clack.spinner()
  spinner.start('Scaffolding project')

  // 使用 degit 克隆模板
  await cloneViteTemplate(template, root, packageManager, spinner)

  // 修改 package.json 名称
  const pkgPath = path.join(root, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.name = toValidPackageName(getProjectName())
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  // 处理 SWC 和 React Compiler 配置
  const isTs = template.includes('ts')
  if (shouldUseSWC) {
    spinner.message('Setting up SWC...')
    setupReactSWC(root, isTs)
  }
  if (shouldUseReactCompiler) {
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
    patched = updatePluginComponentName(patched, pluginName, componentName as string)
    fs.writeFileSync(viteConfigPath, patched)
  }

  spinner.stop('Project created')

  // 询问是否立即安装
  const shouldInstall = await clack.confirm({
    message: 'Install dependencies and start dev server?',
    initialValue: true,
  })

  if (clack.isCancel(shouldInstall)) {
    // 用户取消
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
