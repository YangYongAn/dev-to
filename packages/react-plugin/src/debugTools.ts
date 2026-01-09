import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import {
  PLUGIN_LOG_PREFIX,
  STABLE_BASE_PATH,
  STABLE_CONTRACT_PATH,
  STABLE_DEBUG_HTML_PATH,
  STABLE_DEBUG_JSON_PATH,
  STABLE_DISCOVERY_PATH,
  STABLE_INIT_PATH,
  STABLE_LOADER_BASE_PATH,
  STABLE_LOADER_UMD_PATH,
  STABLE_REACT_RUNTIME_PATH,
} from './constants.js'
import { renderDebugHtml } from './debugHtml.js'
import { getLanIPv4Hosts } from './lan.js'
import { toFsPathFromViteEntry } from './pathUtils.js'

import { DEV_TO_REACT_DID_OPEN_BROWSER_KEY } from '@dev-to/react-shared'
import pc from 'picocolors'

import type { DevToDiscoveryContract } from '@dev-to/react-shared'
import type { ViteDevServer } from 'vite'

import type { BridgeContract, BridgeStats, DebugStartupState, DevComponentAudit, ResolvedDevComponentConfig } from './types.js'
import { createLoaderUmdWrapper } from './loaderUmdWrapper.js'

export interface DebugToolsContext {
  contract: BridgeContract
  stats: BridgeStats
  audit: DevComponentAudit
  resolvedConfig: ResolvedDevComponentConfig
  configDir: string
  open?: boolean
}

/**
 * 尝试复用已有的浏览器标签页（仅限 macOS + Chrome/Edge/Safari）
 * 逻辑参考自 CRA 的 openBrowser 核心思路
 */
function openBrowser(url: string) {
  const bridgePath = STABLE_DEBUG_HTML_PATH

  if (process.platform === 'darwin') {
    // 使用 AppleScript 查找包含特定路径的标签页并刷新（尽量复用已打开的 tab）
    const script = `
      try
        tell application "Google Chrome"
          repeat with w in windows
            repeat with t in tabs of w
              if URL of t contains "${bridgePath}" then
                set URL of t to "${url}"
                set active tab index of w to (get index of t)
                set index of w to 1
                activate
                return "found"
              end if
            end repeat
          end repeat
        end tell
      end try

      try
        tell application "Microsoft Edge"
          repeat with w in windows
            repeat with t in tabs of w
              if URL of t contains "${bridgePath}" then
                set URL of t to "${url}"
                set active tab index of w to (get index of t)
                set index of w to 1
                activate
                return "found"
              end if
            end repeat
          end repeat
        end tell
      end try

      try
        tell application "Safari"
          repeat with w in windows
            repeat with t in tabs of w
              if URL of t contains "${bridgePath}" then
                set URL of t to "${url}"
                set current tab of w to t
                set index of w to 1
                activate
                return "found"
              end if
            end repeat
          end repeat
        end tell
      end try

      return "not_found"
    `.replace(/\n/g, ' ')

    exec(`osascript -e '${script}'`, (err, stdout) => {
      if (err || stdout.trim() !== 'found') {
        // 如果没找到已开的标签页，或者不是 Chrome/Edge，则执行普通打开
        exec(`open "${url}"`)
      }
    })
    return
  }

  // Windows 或 Linux 仍使用默认打开方式
  if (process.platform === 'win32') {
    exec(`start "" "${url}"`)
    return
  }
  exec(`xdg-open "${url}"`)
}

/**
 * 获取 @dev-to/react-loader 的 UMD 文件路径
 * 兼容 npm 包和 monorepo 两种场景，使用 Node.js 标准模块解析规则
 */
function getReactLoaderUmdPath(): string {
  const require = createRequire(import.meta.url)

  // 策略 1: 直接解析 package.json（npm 包场景）
  try {
    const loaderPkgPath = require.resolve('@dev-to/react-loader/package.json')
    const loaderPkgDir = path.dirname(loaderPkgPath)
    const umdPath = path.join(loaderPkgDir, 'dist/index.umd.js')

    if (fs.existsSync(umdPath)) {
      return umdPath
    }
  }
  catch {
    // 继续尝试下一个策略
  }

  // 策略 2: 通过主模块回溯找到 package.json（monorepo 场景）
  try {
    const loaderMainPath = require.resolve('@dev-to/react-loader')
    // 从 dist/index.js 往上两级到包根目录
    const loaderPkgDir = path.dirname(path.dirname(loaderMainPath))
    const umdPath = path.join(loaderPkgDir, 'dist/index.umd.js')

    if (fs.existsSync(umdPath)) {
      return umdPath
    }
  }
  catch {
    // 继续尝试下一个策略
  }

  // 策略 3: 兼容 monorepo 本地开发的相对路径
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const umdPath = path.resolve(__dirname, '../../react-loader/dist/index.umd.js')

    if (fs.existsSync(umdPath)) {
      return umdPath
    }
  }
  catch {
    // 继续
  }

  // 所有策略都失败
  throw new Error(
    `${PLUGIN_LOG_PREFIX} react-loader UMD not found. Run 'pnpm build' in react-loader package.`,
  )
}

// 模块级全局变量，确保进程生命周期内只打开一次
// 注意：由于 Vite 重启会重新加载插件模块，这里使用 global 来持久化状态
const globalState = globalThis as typeof globalThis & Record<string, unknown>
let didOpenBrowser = Boolean(globalState[DEV_TO_REACT_DID_OPEN_BROWSER_KEY])

export function installDebugTools(server: ViteDevServer, ctx: DebugToolsContext, state: DebugStartupState) {
  // 插件启动后，在 Vite 启动控制台打印 debug 地址，提示开发者查看说明/状态面板
  const printStartupDebugUrl = () => {
    if (state.didPrintStartupDebugUrl) return
    state.didPrintStartupDebugUrl = true

    const isHttps = !!server.config.server.https
    const proto = isHttps ? 'https' : 'http'
    const addr = server.httpServer?.address()
    const actualPort = addr && typeof addr === 'object' ? addr.port : undefined
    const port = (() => {
      if (typeof actualPort === 'number') return actualPort
      if (typeof server.config.server.port === 'number') return server.config.server.port
      return 5173
    })()

    const lanHosts = getLanIPv4Hosts()
    const candidateHosts = ['localhost', '127.0.0.1', ...lanHosts]
    const urls = candidateHosts.map(h => `${proto}://${h}:${port}${STABLE_DEBUG_HTML_PATH}`)

    const logger = server.config.logger
    const info = typeof logger?.info === 'function' ? logger.info.bind(logger) : console.log

    info('')
    info(`${PLUGIN_LOG_PREFIX} Debug panel:`)
    urls.forEach(u => info(`  ${pc.cyan(u)}`))
    info(`  JSON: ${pc.cyan(`${proto}://localhost:${port}${STABLE_DEBUG_JSON_PATH}`)}`)
    info('')

    if (ctx.open && !didOpenBrowser) {
      didOpenBrowser = true
      globalState[DEV_TO_REACT_DID_OPEN_BROWSER_KEY] = true
      openBrowser(urls[0])
    }
  }

  try {
    // 监听 server 启动完成（拿到真实端口）
    if (server.httpServer) {
      server.httpServer.once('listening', printStartupDebugUrl)
      if (server.httpServer.listening) {
        printStartupDebugUrl()
      }
    }
  }
  catch {
    // ignore
  }

  // 可视化说明页（给开发者看发生了什么、需要注意什么）
  server.middlewares.use((req, res, next) => {
    const url = req.url || ''
    const pathname = String(url).split('?')[0]

    // 请求统计：用于粗略判断宿主是否走到了 contract/init/runtime
    // 注意：统计基于模块请求次数，受 Vite 缓存、HMR、刷新等影响，仅作为“走到哪一步”的辅助信号。
    const now = Date.now()
    if (pathname === STABLE_CONTRACT_PATH) {
      ctx.stats.contract.count += 1
      ctx.stats.contract.lastAt = now
    }
    else if (pathname === STABLE_INIT_PATH) {
      ctx.stats.init.count += 1
      ctx.stats.init.lastAt = now
    }
    else if (pathname === STABLE_REACT_RUNTIME_PATH) {
      ctx.stats.runtime.count += 1
      ctx.stats.runtime.lastAt = now
    }

    if (url === STABLE_BASE_PATH || url === `${STABLE_BASE_PATH}/`) {
      res.statusCode = 302
      res.setHeader('Location', STABLE_DEBUG_HTML_PATH)
      res.end()
      return
    }

    // Handle unified discovery endpoint: /__dev_to__/discovery.json
    if (url.startsWith(STABLE_DISCOVERY_PATH)) {
      const isHttps = !!server.config.server.https
      const proto = isHttps ? 'https' : 'http'
      const addr = server.httpServer?.address()
      const actualPort = addr && typeof addr === 'object' ? addr.port : undefined

      const lanHosts = getLanIPv4Hosts()
      const candidateHosts = ['localhost', '127.0.0.1', ...lanHosts]
      const originCandidates = candidateHosts.map(
        h => `${proto}://${h}${actualPort ? `:${actualPort}` : ''}`,
      )

      // Get React version from package.json
      const require = createRequire(import.meta.url)
      let reactVersion = '18.x'
      try {
        const reactPkgPath = require.resolve('react/package.json')
        const reactPkg = JSON.parse(fs.readFileSync(reactPkgPath, 'utf-8'))
        reactVersion = reactPkg.version || '18.x'
      }
      catch {
        // Fallback to default
      }

      // Transform component map to discovery format
      const components: DevToDiscoveryContract['components'] = {}
      for (const [name, entry] of Object.entries(ctx.contract?.dev?.componentMap || {})) {
        components[name] = {
          name,
          entry,
          framework: 'react',
        }
      }

      const discovery: DevToDiscoveryContract = {
        framework: {
          type: 'react',
          version: reactVersion,
        },
        server: {
          host: String(server.config.server.host || 'localhost'),
          port: actualPort || server.config.server.port || 5173,
          protocol: proto as 'http' | 'https',
          origins: originCandidates,
        },
        endpoints: {
          discovery: STABLE_DISCOVERY_PATH,
          contract: STABLE_CONTRACT_PATH,
          init: STABLE_INIT_PATH,
          runtime: STABLE_REACT_RUNTIME_PATH,
          debug: {
            html: STABLE_DEBUG_HTML_PATH,
            json: STABLE_DEBUG_JSON_PATH,
          },
          loader: {
            base: STABLE_LOADER_BASE_PATH,
            umd: STABLE_LOADER_UMD_PATH,
          },
        },
        components,
        events: {
          fullReload: ctx.contract?.events?.fullReload || '',
          hmrUpdate: ctx.contract?.events?.hmrUpdate || '',
        },
        protocol: {
          version: '2.0.0',
          apiLevel: 1,
        },
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.end(JSON.stringify(discovery, null, 2))
      return
    }

    if (url.startsWith(STABLE_DEBUG_JSON_PATH)) {
      const isHttps = !!server.config.server.https
      const proto = isHttps ? 'https' : 'http'
      const hostHeader = String(req.headers.host || '')
      const addr = server.httpServer?.address()
      const actualPort = addr && typeof addr === 'object' ? addr.port : undefined

      const lanHosts = getLanIPv4Hosts()
      const candidateHosts = ['localhost', '127.0.0.1', ...lanHosts]
      const originCandidates = candidateHosts.map(
        h => `${proto}://${h}${actualPort ? `:${actualPort}` : ''}`,
      )
      const requestOrigin = hostHeader ? `${proto}://${hostHeader}` : originCandidates[0]

      const componentNames = Object.keys(ctx.contract?.dev?.componentMap || {})
      const libComponentExample = componentNames.slice(0, 2).join(',') || 'Demo'

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(
        JSON.stringify(
          {
            contract: ctx.contract,
            stats: ctx.stats,
            audit: ctx.audit,
            server: {
              protocol: proto,
              hostHeader,
              actualPort,
              config: {
                host: server.config.server.host,
                port: server.config.server.port,
                strictPort: server.config.server.strictPort,
                cors: server.config.server.cors,
                https: !!server.config.server.https,
              },
            },
            originCandidates,
            usage: {
              localStorageKey: 'VITE_DEV_SERVER_ORIGIN',
              suggested: requestOrigin,
              snippet: `localStorage.setItem('VITE_DEV_SERVER_ORIGIN', '${requestOrigin}'); location.reload();`,
              libBuild: {
                command: 'vite build --mode lib',
                env: {
                  // 逗号分隔；用于在仅构建子集时指定目标 componentName
                  DEV_TO_REACT_LIB_SECTION: libComponentExample,
                },
                output: {
                  dir: 'dist/<component>/',
                  js: '<component>.js (UMD, 尽量单文件 bundle)',
                  css: '<component>.css (如有样式)',
                },
                externals: ['react', 'react-dom', 'react-dom/client'],
                umdGlobals: {
                  'react': 'React',
                  'react-dom': 'ReactDOM',
                  'react-dom/client': 'ReactDOMClient',
                },
                jsx: 'classic (React.createElement)',
                customizable:
                  'options.css (dev/build; false disables plugin-injected CSS config; object deep-merged) and options.build (lib mode only; deep-merged with internal defaults, user wins)',
              },
            },
            tips: [
              '宿主侧需设置 localStorage.VITE_DEV_SERVER_ORIGIN（可从 originCandidates 里选择一个可访问的 origin）。',
              'components 参数的 key 必须与后端返回的 componentName 完全一致（严格匹配）。',
              'Fast Refresh 关键：必须先 import init.js（安装 react-refresh preamble），再 import react-dom/client。',
              '如需产出可分发 UMD 包：使用 `vite build --mode lib`（仅构建 components 指定的组件，输出到 dist/<component>/）。',
            ],
          },
          null,
          2,
        ),
      )
      return
    }

    // Handle react-loader UMD endpoint: /__dev_to__/react/loader.js
    // Serve local react-loader UMD build for testing (before publishing to npm)
    if (pathname === STABLE_LOADER_UMD_PATH) {
      try {
        const reactLoaderUmdPath = getReactLoaderUmdPath()
        const umdCode = fs.readFileSync(reactLoaderUmdPath, 'utf-8')
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        res.end(umdCode)
        return
      }
      catch (error) {
        res.statusCode = 404
        res.end(`${error instanceof Error ? error.message : String(error)}`)
        return
      }
    }

    // Handle loader endpoint: /__dev_to__/react/loader/{ComponentName}.js
    // Returns a lightweight UMD wrapper that uses ReactLoader to load the component
    if (pathname.startsWith(STABLE_LOADER_BASE_PATH)) {
      const loaderPathPattern = new RegExp(`^${STABLE_LOADER_BASE_PATH}/([^/]+)\\.js$`)
      const match = pathname.match(loaderPathPattern)

      if (match) {
        const componentName = match[1]

        // Get server origin
        const isHttps = !!server.config.server.https
        const proto = isHttps ? 'https' : 'http'
        const hostHeader = String(req.headers.host || '')
        const addr = server.httpServer?.address()
        const actualPort = addr && typeof addr === 'object' ? addr.port : undefined

        // Prefer host header, fallback to localhost
        const origin = hostHeader
          ? `${proto}://${hostHeader}`
          : `${proto}://localhost${actualPort ? `:${actualPort}` : ''}`

        // Generate UMD wrapper code (synchronous, no compilation needed)
        // In dev environment, use local react-loader UMD for testing before publishing
        const code = createLoaderUmdWrapper({
          componentName,
          origin,
          contractEndpoint: STABLE_CONTRACT_PATH,
          reactLoaderUrl: `${origin}${STABLE_LOADER_UMD_PATH}`, // Use local UMD for testing
        })

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        res.end(code)
        return
      }
    }

    if (url.startsWith(STABLE_DEBUG_HTML_PATH)) {
      const addr = server.httpServer?.address()
      const actualPort = addr && typeof addr === 'object' ? addr.port : undefined
      const lanHosts = getLanIPv4Hosts()

      const isHttps = !!server.config.server.https
      const proto = isHttps ? 'https' : 'http'
      const candidateHosts = ['localhost', '127.0.0.1', ...lanHosts]
      const originCandidates = candidateHosts.map(
        h => `${proto}://${h}${actualPort ? `:${actualPort}` : ''}`,
      )

      const serverConfigLite = {
        host: server.config.server.host,
        port: server.config.server.port,
        strictPort: server.config.server.strictPort,
        cors: server.config.server.cors,
        https: !!server.config.server.https,
      }

      // 获取配置文件路径：优先使用 Vite 内置 API，否则扫描 vite.config.* 文件
      let configFilePath: string | undefined
      const rootDir = server.config.root || process.cwd()

      // 方法 1: 使用 Vite 内置 API（如果可用）
      configFilePath = server.config.configFile || undefined

      // 方法 2: 如果 Vite API 不可用，扫描 vite.config.* 文件
      if (!configFilePath) {
        try {
          // 读取根目录下的所有文件
          const files = fs.readdirSync(rootDir)
          // 查找 vite.config.* 文件
          const configFile = files.find(file => /^vite\.config\.(ts|js|mjs|cjs|cts)$/.test(file))
          if (configFile) {
            configFilePath = path.resolve(rootDir, configFile)
          }
        }
        catch {
          // 如果读取目录失败，回退到手动检查常见文件名
          const configFiles = [
            'vite.config.ts',
            'vite.config.js',
            'vite.config.mjs',
            'vite.config.cjs',
            'vite.config.cts',
          ]
          for (const file of configFiles) {
            const fullPath = path.resolve(rootDir, file)
            if (fs.existsSync(fullPath)) {
              configFilePath = fullPath
              break
            }
          }
        }
      }

      // 将 entry 路径转换为绝对路径映射，用于在表格中创建可点击链接
      const entryPathMap: Record<string, string> = {}
      for (const [componentName, entry] of Object.entries(ctx.contract.dev.componentMap)) {
        if (componentName === '*') {
          entryPathMap[componentName] = ctx.audit.defaultEntryAbs
          continue
        }
        if (entry.startsWith('/@fs')) {
          const fsPath = toFsPathFromViteEntry(entry)
          if (fsPath) {
            entryPathMap[componentName] = fsPath
          }
        }
        else if (entry === '/') {
          // / 表示使用默认入口
          entryPathMap[componentName] = ctx.audit.defaultEntryAbs
        }
        else if (
          !entry.startsWith('http://')
          && !entry.startsWith('https://')
          && !entry.startsWith('/')
        ) {
          // 相对路径，转换为绝对路径
          entryPathMap[componentName] = path.resolve(rootDir, entry)
        }
      }

      const html = renderDebugHtml({
        resolvedDevComponentMap: ctx.contract.dev.componentMap,
        entryPathMap,
        audit: ctx.audit,
        stats: ctx.stats,
        serverConfigLite,
        originCandidates,
        actualPort: typeof actualPort === 'number' ? actualPort : undefined,
        configFilePath,
      })

      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(html)
      return
    }

    next()
  })
}
