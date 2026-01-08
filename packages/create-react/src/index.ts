#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawn, execSync } from 'node:child_process'
import process from 'node:process'
import * as clack from '@clack/prompts'
import { red, cyan, yellow } from 'kolorist'

const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn', 'bun'] as const
type PackageManager = typeof PACKAGE_MANAGERS[number]

const REACT_TEMPLATES = [
  {
    name: 'react-ts',
    display: 'TypeScript',
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
    name: 'react-swc',
    display: 'JavaScript + SWC',
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

    try {
      // Show which source we're trying
      if (i > 0) {
        spinner.message(`Trying ${source.name}...`)
      }

      const { command, args } = source.getCloneCommand(template, targetDir, packageManager)

      // For git-based sources, we need special handling
      if (source.isGitBased) {
        // Clone the entire repo to target directory
        await run(command, args, process.cwd())

        // Extract the template folder from the cloned repo
        const templateSrcPath = path.join(targetDir, 'packages/create-vite', `template-${template}`)

        if (!fs.existsSync(templateSrcPath)) {
          throw new Error(
            `Template not found at ${templateSrcPath}. The repository structure may have changed.`,
          )
        }

        // Move the template files to a temp location
        const tempTargetDir = path.join(process.cwd(), `.tmp-template-${Date.now()}`)
        copyDir(templateSrcPath, tempTargetDir)

        // Clean up the cloned repo
        fs.rmSync(targetDir, { recursive: true, force: true })
        // Move the template to the final location
        fs.renameSync(tempTargetDir, targetDir)
      }
      else {
        // For degit sources, command and args are already properly formatted
        await run(command, args, process.cwd())
      }

      return
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push({ source: source.name, error: errorMsg })

      if (i < TEMPLATE_SOURCES.length - 1) {
        // Not the last source, will try next one
        spinner.message(`${source.name} failed, trying ${TEMPLATE_SOURCES[i + 1].name}...`)
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

  clack.intro(cyan('create-react'))

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
          message: 'Project name:',
          placeholder: 'dev-to-react-app',
          initialValue: argTargetDir,
          defaultValue: argTargetDir || 'dev-to-react-app',
        }),
      shouldOverwrite: ({ results }) => {
        targetDir = formatTargetDir(results.projectName) || 'dev-to-react-app'
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
    },
    {
      onCancel: () => {
        clack.cancel('Operation cancelled.')
        process.exit(0)
      },
    },
  )

  const { shouldOverwrite } = project

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

  spinner.message('Adding @dev-to/react-plugin')

  // 添加插件依赖
  const pluginPackage = '@dev-to/react-plugin'
  const pluginName = 'devToReactPlugin'
  addDevDependency(root, pluginPackage, 'latest')

  // 注入插件到 vite.config
  const viteConfigPath = findViteConfigFile(root)
  if (viteConfigPath) {
    const original = fs.readFileSync(viteConfigPath, 'utf-8')
    const patched = injectPluginIntoViteConfig(original, pluginPackage, pluginName)
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
    const installSpinner = clack.spinner()
    installSpinner.start('Installing dependencies')
    await run(packageManager, ['install'], root)
    installSpinner.stop('Dependencies installed')

    clack.log.info('Starting dev server...')

    // 启动 dev server
    const devArgs = packageManager === 'npm' ? ['run', 'dev'] : ['dev']
    spawn(packageManager, devArgs, { cwd: root, stdio: 'inherit' })
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
