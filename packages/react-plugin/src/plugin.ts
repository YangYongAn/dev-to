import fs from 'node:fs'
import path from 'node:path'

import pc from 'picocolors'
import { mergeConfig, type ConfigEnv, type Plugin, type ResolvedConfig, type UserConfig } from 'vite'

import {
  EVENT_FULL_RELOAD,
  EVENT_HMR_UPDATE,
  PLUGIN_LOG_PREFIX,
  PLUGIN_NAME,
  STABLE_CONTRACT_PATH,
  STABLE_INIT_PATH,
  STABLE_REACT_RUNTIME_PATH,
} from './constants.js'
import { installDebugTools } from './debugTools.js'
import { resolveDevComponentConfig, toViteFsPath } from './devComponentMap.js'
import {
  generateLibBuildNextConfig,
  generateLibVirtualEntryCode,
  isLibBuild,
  normalizeLibCss,
  resolveBuildTargets,
} from './libBuildUtils.js'
import { resolveEntryAbsPath } from './pathUtils.js'
import { injectReactImport, transformAssetUrl, transformViteDevCssAssetUrls } from './transformUtils.js'
import {
  createContractVirtualModuleCode,
  createInitVirtualModuleCode,
  createReactRuntimeVirtualModuleCode,
} from './virtualModules.js'

import type {
  BridgeContract,
  BridgeStats,
  DebugStartupState,
  DevComponentMapInput,
  DevToReactPluginOptions,
} from './types.js'

interface LibBuildState {
  enabled: boolean
  isChild: boolean
  currentComponent: string
  currentOutDir: string
  currentOutBase: string
  currentEntryAbs: string
  remainingComponents: string[]
  virtualEntryCode: string
  startAt: number
  totalComponents: number
  currentIndex: number
}

type LibBannerExtra = Partial<{
  root: string
  entry: string
  out: string
  cfg: string
  outDir: string
  file: string
  took: string
}>

/**
 * Dev-to React Plugin for Vite
 *
 * Enables rapid development and library building of React components with hot module replacement.
 * Supports single or multiple component configurations with customizable CSS and build options.
 *
 * Compatible with Vite 4.0.0+
 *
 * @param components - Component configuration
 *   - `string`: Single component name as wildcard (e.g. `'Button'`)
 *   - `Record<string, string>`: Component name to file path mapping (e.g. `{ Button: 'src/Button.tsx' }`)
 *   - `undefined`: Fallback to root index file
 * @param options - Plugin options for CSS and build configuration
 * @returns Array of Vite plugins (compatible with all Vite versions)
 *
 * @example
 * // Single component with wildcard
 * devToReactPlugin('Button')
 *
 * @example
 * // Multiple components
 * devToReactPlugin({
 *   Button: 'src/Button.tsx',
 *   Dialog: 'src/Dialog.tsx',
 *   Input: 'src/Input.tsx',
 * })
 *
 * @example
 * // With custom options
 * devToReactPlugin(
 *   { Button: 'src/Button.tsx' },
 *   {
 *     css: { modules: { localsConvention: 'camelCase' } },
 *     open: true,
 *   }
 * )
 *
 * @example
 * // Fallback to root entry
 * devToReactPlugin(undefined, { css: false })
 */
export function devToReactPlugin(
  components?: DevComponentMapInput,
  options?: DevToReactPluginOptions,
): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  const componentsMap = components ?? {}
  const opts = options ?? {}
  const stats: BridgeStats = {
    contract: { count: 0, lastAt: 0 },
    init: { count: 0, lastAt: 0 },
    runtime: { count: 0, lastAt: 0 },
  }
  const debugState: DebugStartupState = { didPrintStartupDebugUrl: false }

  // 以配置文件所在目录作为"工程根"进行路径解析，不依赖 Vite 的 root 配置
  let configDir = process.cwd()
  let currentRootDir = configDir
  let resolvedConfig = resolveDevComponentConfig(currentRootDir, componentsMap, configDir)

  // Get version from package.json in the config directory
  let version = '0.0.0'
  try {
    const pkgPath = path.join(configDir, 'package.json')
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      version = pkg.version || version
    }
  }
  catch {
    // ignore
  }

  const createContract = (
    componentMap: Record<string, string>,
    defaultEntryAbs: string,
    isDevMode = false,
  ): BridgeContract => {
    // 在 dev 模式下，将 componentMap 中的 / 转换为 /@fs/... 路径
    // 在 build lib 模式下，保留 / 以便识别
    const processedComponentMap: Record<string, string> = {}
    for (const [key, value] of Object.entries(componentMap)) {
      if (value === '/' && isDevMode) {
        processedComponentMap[key] = toViteFsPath(defaultEntryAbs)
      }
      else {
        processedComponentMap[key] = value
      }
    }
    return {
      paths: {
        contract: STABLE_CONTRACT_PATH,
        initClient: STABLE_INIT_PATH,
        reactRuntime: STABLE_REACT_RUNTIME_PATH,
      },
      events: { fullReload: EVENT_FULL_RELOAD, hmrUpdate: EVENT_HMR_UPDATE },
      dev: { componentMap: processedComponentMap },
    }
  }

  let contract = createContract(
    resolvedConfig.componentMap,
    resolvedConfig.defaultEntryAbs,
    true, // 初始创建时假设是 dev 模式
  )
  let viteResolved: ResolvedConfig | null = null

  const libBuildState: LibBuildState = {
    enabled: false,
    isChild: false,
    currentComponent: '',
    currentOutDir: '',
    currentOutBase: '',
    currentEntryAbs: '',
    remainingComponents: [],
    virtualEntryCode: '',
    startAt: 0,
    totalComponents: 0,
    currentIndex: 1,
  }

  const shortenPath = (p?: string) => {
    if (!p) return ''
    const normalize = (abs: string) => `/${path.relative(configDir, abs).replace(/\\/g, '/')}`
    if (p.startsWith('/@fs')) return normalize(p.slice(4))
    if (path.isAbsolute(p)) return normalize(p)
    return p
  }

  const stripAnsi = (input: string) => {
    let out = ''
    for (let i = 0; i < input.length; i += 1) {
      // ESC[...m
      if (input.charCodeAt(i) === 27 && input[i + 1] === '[') {
        i += 2
        while (i < input.length && input[i] !== 'm') i += 1
        continue
      }
      out += input[i]
    }
    return out
  }

  let lastComponentPrinted = ''

  const printLibBanner = (
    step: 'prepare' | 'done' | 'spawn',
    component: string,
    extra: LibBannerExtra = {},
  ) => {
    const lines: string[] = []
    const push = (s: string) => lines.push(s)

    // 1. Orchestration logs (spawn) - handled separately
    if (step === 'spawn') {
      // Skip orchestration logs as requested
      return
    }
    else {
      // 2. Component Header - Only once per component
      const isNewComponent = lastComponentPrinted !== component
      if (isNewComponent) {
        // Update the "Preparing..." line to "Prepared" with a checkmark
        if (process.stdout.isTTY) {
          const progressStr
            = libBuildState.totalComponents > 1
              ? pc.dim(` [${libBuildState.currentIndex}/${libBuildState.totalComponents}]`)
              : ''
          process.stdout.write(
            `\r  ✅  ${pc.dim('Prepared component:')}  ${pc.bold(pc.magenta(component))}${progressStr}      \n`,
          )
        }

        if (lastComponentPrinted) push('\n\n') // Gap between components
        lastComponentPrinted = component

        const progress
          = libBuildState.totalComponents > 1
            ? pc.dim(` [${libBuildState.currentIndex}/${libBuildState.totalComponents}]`)
            : ''
        const title = ` 📦 Building Component: ${component}${progress} `
        const border = '━'.repeat(stripAnsi(title).length)
        push(pc.cyan(`┏${border}┓`))
        push(`${pc.cyan('┃')}${pc.bold(pc.magenta(title))}${pc.cyan('┃')}`)
        push(pc.cyan(`┗${border}┛`))
      }

      // 3. Indented Sub-steps with specialized icons and short paths
      if (step === 'prepare') {
        const root = pc.dim(shortenPath(extra.root))
        const name = pc.bold(pc.cyan(component))
        const src = pc.blue(shortenPath(extra.entry))
        const out = extra.out ? pc.dim(' ➔ ') + pc.yellow(shortenPath(extra.out)) : ''
        push(
          `${pc.cyan(PLUGIN_NAME)} ${pc.dim(`v${version}`)} ${pc.dim('building')} ${name}${pc.dim(':')} ${root} ${pc.dim('➔')} ${src}${out}`,
        )
      }
      else if (step === 'done') {
        push('\n')
      }
    }

    const msg = lines.join('\n')
    if (msg.trim() || (step === 'done' && msg === '\n')) {
      if (viteResolved?.logger) viteResolved.logger.info(msg)
      else console.log(msg)
    }
  }

  const corePlugin: Plugin = {
    name: '@dev-to/react-plugin',
    enforce: 'pre',

    /**
     * 确保 /__dev_to__/ 路径不受用户 base 配置影响
     *
     * 当用户设置了 base (如 /app/ 或 https://cdn.com/)，Vite 会自动为所有路径添加前缀。
     * 但 /__dev_to__/ 是插件的内部路径，应该保持稳定。
     *
     * 实现方式：
     * 1. resolveId: 规范化路径，移除可能的 base 前缀，确保虚拟模块正确解析
     * 2. configureServer: 中间件直接拦截原始 URL，不经过 Vite 的 base 处理
     *
     * 这样无论用户如何配置 base，/__dev_to__/ 路径在开发和生产环境都保持一致。
     */

    configureServer(server) {
      // dev 模式下，将 contract 中的 @ 转换为 /@fs/... 路径
      contract = createContract(
        resolvedConfig.componentMap,
        resolvedConfig.defaultEntryAbs,
        true, // dev 模式
      )
      // dev 模式下，如果未配置 componentName (此时 componentMap 为 { '*': '/' })，输出警告
      if (
        Object.keys(resolvedConfig.componentMap).length === 1
        && resolvedConfig.componentMap['*'] === '/'
      ) {
        const warn = server.config.logger?.warn?.bind(server.config.logger) ?? console.warn
        warn('')
        warn(
          `⚠️  ${PLUGIN_LOG_PREFIX} No componentName configured. This works in dev mode but will fail in library build (dev-to build / --mode lib).`,
        )
        warn(
          `   Please use devToReactPlugin({ ComponentName: "src/ComponentName.tsx" }) or devToReactPlugin({ ComponentName: "/" }) to specify components.`,
        )
        warn(
          `   Or use wildcard: devToReactPlugin({ "*": "/" }) or devToReactPlugin("*")`,
        )
        warn('')
      }
      installDebugTools(
        server,
        { contract, stats, audit: resolvedConfig.audit, resolvedConfig, configDir, open: opts.open },
        debugState,
      )
    },

    config(userConfig: UserConfig, env: ConfigEnv) {
      const rootDir = configDir
      if (rootDir !== currentRootDir) {
        currentRootDir = rootDir
        resolvedConfig = resolveDevComponentConfig(rootDir, componentsMap, configDir)
        // 在 config hook 中，如果是 build lib 模式，保留 @；如果是 dev 模式，会在 configureServer 中转换
        const isDev = !isLibBuild(env)
        contract = createContract(
          resolvedConfig.componentMap,
          resolvedConfig.defaultEntryAbs,
          isDev,
        )
      }

      const next: UserConfig = {
        server: { host: userConfig.server?.host ?? true, cors: userConfig.server?.cors ?? true },
        css: { modules: { generateScopedName: '[name]__[local]___[hash:base64:5]' } },
      }

      if (opts.css === false) {
        next.css = undefined
      }
      else if (opts.css) {
        next.css = mergeConfig({ css: next.css }, { css: opts.css }).css
      }

      if (isLibBuild(env)) {
        // Library build requires at least one explicit componentName
        const actualNames = Object.keys(contract.dev.componentMap).filter(n => n !== '*')
        if (actualNames.length === 0 && !process.env.DEV_TO_REACT_LIB_SECTION) {
          throw new Error(
            ` ${PLUGIN_LOG_PREFIX} Library build (dev-to build / --mode lib) requires at least one explicit componentName for identification and distribution.\n`
            + `Current configuration is in "global fallback mode", which cannot determine build targets.\n\n`
            + `Please use one of the following to specify components:\n`
            + `  - devToReactPlugin('ComponentName')\n`
            + `  - devToReactPlugin({ ComponentName: '/' })\n`
            + `  - devToReactPlugin({ ComponentName: 'src/ComponentName.tsx' })\n`
            + `\n💡 Tip: Wildcards are convenient for development, but explicit naming is required for production builds.`,
          )
        }

        const isChild = process.env.DEV_TO_REACT_LIB_CHILD === '1'
        const buildTargets = resolveBuildTargets({
          componentMap: contract.dev.componentMap,
          requestedRaw: process.env.DEV_TO_REACT_LIB_SECTION || '',
          defaultEntryAbs: resolvedConfig.defaultEntryAbs,
        })

        const totalComponents = isChild
          ? parseInt(process.env.DEV_TO_REACT_LIB_TOTAL || '1', 10)
          : buildTargets.length
        const currentIndex = parseInt(process.env.DEV_TO_REACT_LIB_INDEX || '1', 10)

        if (!isChild) {
          console.log(`\n${pc.bgCyan(pc.black(pc.bold(' 🏗️  Starting Library Build Process ')))}`)
          console.log(
            `${pc.cyan('┃')} Total components to build: ${pc.bold(pc.magenta(totalComponents))}`,
          )
          console.log(`${pc.cyan('┃')} Build targets: ${pc.dim(buildTargets.join(', '))}\n`)
        }

        const picked = buildTargets[0]

        // Add a pre-announcement to reduce perceived lag during config analysis
        if (process.stdout.isTTY) {
          const progressStr
            = totalComponents > 1 ? pc.dim(` [${currentIndex}/${totalComponents}]`) : ''
          process.stdout.write(
            `  ⌛  ${pc.dim('Preparing component:')}  ${pc.bold(pc.magenta(picked))}${progressStr}...`,
          )
        }
        else {
          console.log(`  ${pc.yellow('⌛')} Preparing component: ${picked}...`)
        }

        const libCfg = generateLibBuildNextConfig({
          rootDir,
          configDir,
          picked,
          componentMap: contract.dev.componentMap,
          resolvedConfig,
          options: opts,
          userConfig,
        })

        Object.assign(libBuildState, {
          enabled: true,
          isChild,
          currentComponent: picked,
          currentOutDir: libCfg.outDir,
          currentOutBase: libCfg.outBase,
          currentEntryAbs: libCfg.resolvedEntryAbs,
          remainingComponents: isChild ? [] : buildTargets.slice(1),
          virtualEntryCode: libCfg.virtualEntryCode,
          startAt: Date.now(),
          totalComponents,
          currentIndex,
        })

        printLibBanner('prepare', picked, {
          root: rootDir,
          entry: libCfg.resolvedEntryAbs,
          out: libCfg.outDir,
        })

        return mergeConfig(next, libCfg.next)
      }

      return next
    },

    configResolved(resolved) {
      viteResolved = resolved
      if (resolved.configFile) {
        const nextConfigDir = path.dirname(resolved.configFile)
        if (nextConfigDir !== configDir) {
          configDir = nextConfigDir
          currentRootDir = configDir
          resolvedConfig = resolveDevComponentConfig(currentRootDir, componentsMap, configDir)
          const isDev = resolved.command === 'serve'
          contract = createContract(
            resolvedConfig.componentMap,
            resolvedConfig.defaultEntryAbs,
            isDev,
          )
        }
      }
    },

    buildStart() {
      // 在构建开始前，确保虚拟模块代码已准备好
      // 如果 lib 构建模式已启用但代码未生成，说明配置有问题
      if (libBuildState.enabled && !libBuildState.virtualEntryCode) {
        throw new Error(
          `${PLUGIN_LOG_PREFIX} lib 构建模式已启用，但虚拟入口模块代码未生成。\n`
          + `当前 component: "${libBuildState.currentComponent}"\n`
          + `这可能是插件配置问题，请检查 vite.config.ts 中的配置。`,
        )
      }
      // 如果 lib 构建模式未启用，但请求了虚拟入口模块，说明时序问题
      // 这种情况下，我们需要在 load 钩子中延迟生成代码
    },

    async closeBundle() {
      if (!libBuildState.enabled) return
      normalizeLibCss(libBuildState.currentOutDir, libBuildState.currentOutBase)

      printLibBanner('done', libBuildState.currentComponent, {
        outDir: libBuildState.currentOutDir,
        file: libBuildState.currentOutBase,
        entry: libBuildState.currentEntryAbs,
        took: libBuildState.startAt ? `${Date.now() - libBuildState.startAt}ms` : undefined,
      })

      if (
        libBuildState.isChild
        || libBuildState.remainingComponents.length === 0
        || !viteResolved?.configFile
      )
        return

      const { build } = await import('vite')
      const prevChild = process.env.DEV_TO_REACT_LIB_CHILD
      const prevSection = process.env.DEV_TO_REACT_LIB_SECTION
      const prevTotal = process.env.DEV_TO_REACT_LIB_TOTAL
      const prevIndex = process.env.DEV_TO_REACT_LIB_INDEX

      let childIdx = libBuildState.currentIndex + 1
      for (const componentName of libBuildState.remainingComponents) {
        process.env.DEV_TO_REACT_LIB_CHILD = '1'
        process.env.DEV_TO_REACT_LIB_SECTION = componentName
        process.env.DEV_TO_REACT_LIB_TOTAL = String(libBuildState.totalComponents)
        process.env.DEV_TO_REACT_LIB_INDEX = String(childIdx++)
        try {
          printLibBanner('spawn', componentName, { cfg: viteResolved.configFile })
          await build({
            configFile: viteResolved.configFile,
            mode: 'lib',
            clearScreen: false,
            logLevel: viteResolved.logLevel,
          })
        }
        finally {
          process.env.DEV_TO_REACT_LIB_CHILD = prevChild

          process.env.DEV_TO_REACT_LIB_SECTION = prevSection

          process.env.DEV_TO_REACT_LIB_TOTAL = prevTotal

          process.env.DEV_TO_REACT_LIB_INDEX = prevIndex
        }
      }
    },

    resolveId(source) {
      // 规范化路径：移除可能的 base 前缀，确保 /__dev_to__/ 路径始终可用
      // 这样即使用户设置了 base (如 /app/ 或 https://cdn.com/)，
      // /__dev_to__/ 路径也能正确解析为虚拟模块
      let normalizedSource = source

      // 如果是绝对 URL，提取路径部分
      if (source.startsWith('http://') || source.startsWith('https://')) {
        try {
          normalizedSource = new URL(source).pathname
        }
        catch {
          // 解析失败，保持原样
        }
      }

      // 移除可能的 base 前缀（支持多层路径）
      // 例如：/app/__dev_to__/react/contract.js -> /__dev_to__/react/contract.js
      if (normalizedSource !== STABLE_CONTRACT_PATH && normalizedSource.includes(STABLE_CONTRACT_PATH)) {
        normalizedSource = STABLE_CONTRACT_PATH
      }
      if (normalizedSource !== STABLE_INIT_PATH && normalizedSource.includes(STABLE_INIT_PATH)) {
        normalizedSource = STABLE_INIT_PATH
      }
      if (normalizedSource !== STABLE_REACT_RUNTIME_PATH && normalizedSource.includes(STABLE_REACT_RUNTIME_PATH)) {
        normalizedSource = STABLE_REACT_RUNTIME_PATH
      }

      // 检查虚拟模块路径
      if (normalizedSource === STABLE_CONTRACT_PATH || normalizedSource.endsWith(STABLE_CONTRACT_PATH))
        return `\0virtual:${PLUGIN_NAME}-contract`
      if (normalizedSource === STABLE_INIT_PATH || normalizedSource.endsWith(STABLE_INIT_PATH))
        return `\0virtual:${PLUGIN_NAME}-init`
      if (normalizedSource === STABLE_REACT_RUNTIME_PATH || normalizedSource.endsWith(STABLE_REACT_RUNTIME_PATH))
        return `\0virtual:${PLUGIN_NAME}-react-runtime`

      // 处理 lib 构建的虚拟入口模块
      if (source.includes(`virtual:${PLUGIN_NAME}-lib-entry:`)) {
        const pos = source.indexOf(`virtual:${PLUGIN_NAME}-lib-entry:`)
        const virtualSource = source.slice(pos)
        // 返回带 \0 前缀的虚拟模块 ID
        return `\0${virtualSource}`
      }
      return null
    },

    load(id) {
      if (id === `\0virtual:${PLUGIN_NAME}-contract`)
        return createContractVirtualModuleCode(contract)
      if (id === `\0virtual:${PLUGIN_NAME}-init`) return createInitVirtualModuleCode()
      if (id === `\0virtual:${PLUGIN_NAME}-react-runtime`)
        return createReactRuntimeVirtualModuleCode()
      // 处理 lib 构建的虚拟入口模块
      if (id.startsWith(`\0virtual:${PLUGIN_NAME}-lib-entry:`)) {
        // 提取 componentName
        const componentName = id.replace(`\0virtual:${PLUGIN_NAME}-lib-entry:`, '')

        if (libBuildState.enabled) {
          if (libBuildState.virtualEntryCode) {
            return libBuildState.virtualEntryCode
          }
          // 如果 enabled 但 virtualEntryCode 为空，说明配置有问题
          throw new Error(
            `${PLUGIN_LOG_PREFIX} 虚拟入口模块 "${id}" (componentName: "${componentName}") 的代码未生成。\n`
            + `这可能是插件配置问题，请检查 vite.config.ts 中的配置。\n`
            + `当前 libBuildState: ${JSON.stringify({ enabled: libBuildState.enabled, currentComponent: libBuildState.currentComponent, hasCode: !!libBuildState.virtualEntryCode })}`,
          )
        }

        // 如果 config 钩子还没执行（libBuildState.enabled 为 false），
        // 可能是 Rollup 在 config 之前就尝试解析了入口
        // 这种情况下，我们需要延迟生成代码
        // 尝试从 resolvedConfig 中获取信息并生成代码
        if (resolvedConfig && resolvedConfig.componentMap) {
          const entryFromMap = resolvedConfig.componentMap[componentName]
          if (entryFromMap) {
            // 尝试生成虚拟入口代码
            const abs = resolveEntryAbsPath(
              currentRootDir,
              entryFromMap,
              resolvedConfig.defaultEntryAbs,
              configDir,
            )
            if (abs) {
              try {
                const code = generateLibVirtualEntryCode({
                  rootDir: currentRootDir,
                  defaultEntryAbs: abs,
                  componentName,
                })
                // 缓存生成的代码
                libBuildState.virtualEntryCode = code
                libBuildState.enabled = true
                libBuildState.currentComponent = componentName
                return code
              }
              catch (error) {
                // 如果生成失败，抛出错误
                throw new Error(
                  `${PLUGIN_LOG_PREFIX} 无法生成虚拟入口模块代码：${error instanceof Error ? error.message : String(error)}`,
                )
              }
            }
          }
        }

        // 如果无法延迟生成，抛出错误
        throw new Error(
          `${PLUGIN_LOG_PREFIX} 虚拟入口模块 "${id}" (componentName: "${componentName}") 在插件配置完成之前被请求，且无法延迟生成代码。\n`
          + `这可能是 Vite/Rollup 的内部时序问题。\n`
          + `请尝试重新运行构建命令，如果问题持续，请检查 vite.config.ts 中的配置。`,
        )
      }
      return null
    },

    transform(code, id) {
      if (libBuildState.enabled) {
        const injected = injectReactImport(code, id)
        if (injected) return injected
      }
      return transformAssetUrl(code, id)
    },
  }

  const devCssAssetPlugin: Plugin = {
    name: '@dev-to/react-plugin:dev-css-asset-url',
    enforce: 'post',
    transform(code, id) {
      return transformViteDevCssAssetUrls(code, id)
    },
  }

  const libPostPlugin: Plugin = {
    name: '@dev-to/react-plugin:lib-post',
    enforce: 'post',
    config(_userConfig, env) {
      if (!isLibBuild(env)) return null
      return {
        esbuild: {
          jsx: 'transform',
          jsxFactory: 'React.createElement',
          jsxFragment: 'React.Fragment',
        },
      }
    },
  }

  return [corePlugin, devCssAssetPlugin, libPostPlugin]
}
