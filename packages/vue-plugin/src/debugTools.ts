import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import {
  STABLE_BASE_PATH,
  STABLE_CONTRACT_PATH,
  STABLE_DEBUG_HTML_PATH,
  STABLE_DEBUG_JSON_PATH,
  STABLE_DISCOVERY_PATH,
  STABLE_INIT_PATH,
  STABLE_LOADER_BASE_PATH,
  STABLE_LOADER_UMD_PATH,
  STABLE_VUE_RUNTIME_PATH,
} from './constants.js'
import { renderDebugHtml } from './debugHtml.js'
import { getLanIPv4Hosts } from './lan.js'
import { toFsPathFromViteEntry } from './pathUtils.js'
import { createLoaderUmdWrapper } from './loaderUmdWrapper.js'

import { DEV_TO_BASE_PATH, DEV_TO_VUE_DID_OPEN_BROWSER_KEY } from '@dev-to/shared'

import type { DevToDiscoveryContract } from '@dev-to/shared'
import type { ViteDevServer } from 'vite'

import type { BridgeContract, BridgeStats, DebugStartupState, DevComponentAudit, ResolvedDevComponentConfig } from './types.js'

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
 */
function openBrowser(url: string) {
  const bridgePath = STABLE_DEBUG_HTML_PATH

  if (process.platform === 'darwin') {
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
        exec(`open "${url}"`)
      }
    })
    return
  }

  if (process.platform === 'win32') {
    exec(`start "" "${url}"`)
    return
  }
  exec(`xdg-open "${url}"`)
}

/**
 * 获取 @dev-to/vue-loader 的 UMD 文件路径
 * 兼容 npm 包和 monorepo 两种场景
 */
function getVueLoaderUmdPath(): string | null {
  const require = createRequire(import.meta.url)

  // 策略 1: 直接解析 package.json（npm 包场景）
  try {
    const loaderPkgPath = require.resolve('@dev-to/vue-loader/package.json')
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
    const loaderMainPath = require.resolve('@dev-to/vue-loader')
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
    const umdPath = path.resolve(__dirname, '../../vue-loader/dist/index.umd.js')

    if (fs.existsSync(umdPath)) {
      return umdPath
    }
  }
  catch {
    // 继续
  }

  return null
}

const globalState = globalThis as typeof globalThis & Record<string, unknown>
let didOpenBrowser = Boolean(globalState[DEV_TO_VUE_DID_OPEN_BROWSER_KEY])

export function installDebugTools(server: ViteDevServer, ctx: DebugToolsContext, state: DebugStartupState) {
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

    const logger = server.config.logger
    const info = typeof logger?.info === 'function' ? logger.info.bind(logger) : console.log

    setImmediate(() => {
      info('')
      info(`  DevTo: ${proto}://localhost:${port}${DEV_TO_BASE_PATH}`)
    })

    if (ctx.open && !didOpenBrowser) {
      didOpenBrowser = true
      globalState[DEV_TO_VUE_DID_OPEN_BROWSER_KEY] = true
      const debugUrl = `${proto}://localhost:${port}${STABLE_DEBUG_HTML_PATH}`
      openBrowser(debugUrl)
    }
  }

  try {
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

  server.middlewares.use((req, res, next) => {
    const url = req.url || ''
    const pathname = String(url).split('?')[0]

    const now = Date.now()
    if (pathname === STABLE_CONTRACT_PATH) {
      ctx.stats.contract.count += 1
      ctx.stats.contract.lastAt = now
    }
    else if (pathname === STABLE_INIT_PATH) {
      ctx.stats.init.count += 1
      ctx.stats.init.lastAt = now
    }
    else if (pathname === STABLE_VUE_RUNTIME_PATH) {
      ctx.stats.runtime.count += 1
      ctx.stats.runtime.lastAt = now
    }

    if (url === STABLE_BASE_PATH || url === `${STABLE_BASE_PATH}/`) {
      res.statusCode = 302
      res.setHeader('Location', STABLE_DEBUG_HTML_PATH)
      res.end()
      return
    }

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

      const require = createRequire(import.meta.url)
      let vueVersion = '3.x'
      try {
        const vuePkgPath = require.resolve('vue/package.json')
        const vuePkg = JSON.parse(fs.readFileSync(vuePkgPath, 'utf-8'))
        vueVersion = vuePkg.version || vueVersion
      }
      catch {
        // ignore
      }

      const components: DevToDiscoveryContract['components'] = {}
      for (const [name, entry] of Object.entries(ctx.contract?.dev?.componentMap || {})) {
        components[name] = {
          name,
          entry,
          framework: 'vue',
        }
      }

      const discovery: DevToDiscoveryContract = {
        framework: {
          type: 'vue',
          version: vueVersion,
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
          runtime: STABLE_VUE_RUNTIME_PATH,
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
                command: 'dev-to build',
                env: {
                  DEV_TO_VUE_LIB_SECTION: libComponentExample,
                },
                output: {
                  dir: 'dist/<component>/',
                  js: '<component>.js (UMD, 尽量单文件 bundle)',
                  css: '<component>.css (如有样式)',
                },
                externals: ['vue'],
                umdGlobals: {
                  vue: 'Vue',
                },
              },
            },
            tips: [
              '宿主侧需设置 localStorage.VITE_DEV_SERVER_ORIGIN（可从 originCandidates 里选择一个可访问的 origin）。',
              'components 参数的 key 必须与后端返回的 componentName 完全一致（严格匹配）。',
              '如需产出可分发 UMD 包：使用 `dev-to build`（等价于 `vite build --mode lib`，仅构建 components 指定的组件，输出到 dist/<component>/）。',
            ],
          },
          null,
          2,
        ),
      )
      return
    }

    // Handle vue-loader UMD endpoint: /__dev_to__/vue/loader.js
    if (pathname === STABLE_LOADER_UMD_PATH) {
      const vueLoaderUmdPath = getVueLoaderUmdPath()

      if (vueLoaderUmdPath) {
        try {
          const umdCode = fs.readFileSync(vueLoaderUmdPath, 'utf-8')
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
          res.end(umdCode)
          return
        }
        catch (error) {
          console.warn(`[dev_to:vue] Failed to read local UMD: ${error}. Falling back to CDN.`)
        }
      }

      const cdnUrl = 'https://cdn.jsdelivr.net/npm/@dev-to/vue-loader@latest/dist/index.umd.js'
      res.statusCode = 302
      res.setHeader('Location', cdnUrl)
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.end()
      return
    }

    // Handle loader endpoint: /__dev_to__/vue/loader/{ComponentName}.js
    if (pathname.startsWith(STABLE_LOADER_BASE_PATH)) {
      const loaderPathPattern = new RegExp(`^${STABLE_LOADER_BASE_PATH}/([^/]+)\\.js$`)
      const match = pathname.match(loaderPathPattern)

      if (match) {
        const componentName = match[1]

        const isHttps = !!server.config.server.https
        const proto = isHttps ? 'https' : 'http'
        const hostHeader = String(req.headers.host || '')
        const addr = server.httpServer?.address()
        const actualPort = addr && typeof addr === 'object' ? addr.port : undefined

        const origin = hostHeader
          ? `${proto}://${hostHeader}`
          : `${proto}://localhost${actualPort ? `:${actualPort}` : ''}`

        const hasLocalUmd = getVueLoaderUmdPath() !== null
        const vueLoaderUrl = hasLocalUmd
          ? `${origin}${STABLE_LOADER_UMD_PATH}`
          : 'https://cdn.jsdelivr.net/npm/@dev-to/vue-loader@latest/dist/index.umd.js'

        const code = createLoaderUmdWrapper({
          componentName,
          origin,
          contractEndpoint: STABLE_CONTRACT_PATH,
          vueLoaderUrl,
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

      // 获取配置文件路径
      let configFilePath: string | undefined
      const rootDir = server.config.root || process.cwd()

      configFilePath = server.config.configFile || undefined

      if (!configFilePath) {
        try {
          const files = fs.readdirSync(rootDir)
          const configFile = files.find(file => /^vite\.config\.(ts|js|mjs|cjs|cts)$/.test(file))
          if (configFile) {
            configFilePath = path.resolve(rootDir, configFile)
          }
        }
        catch {
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

      // 将 entry 路径转换为绝对路径映射
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
          entryPathMap[componentName] = ctx.audit.defaultEntryAbs
        }
        else if (
          !entry.startsWith('http://')
          && !entry.startsWith('https://')
          && !entry.startsWith('/')
        ) {
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
