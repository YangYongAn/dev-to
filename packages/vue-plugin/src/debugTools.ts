import { exec } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'

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
import { getLanIPv4Hosts } from './lan.js'

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
            },
          },
          null,
          2,
        ),
      )
      return
    }

    if (url.startsWith(STABLE_DEBUG_HTML_PATH)) {
      const isHttps = !!server.config.server.https
      const proto = isHttps ? 'https' : 'http'
      const addr = server.httpServer?.address()
      const actualPort = addr && typeof addr === 'object' ? addr.port : undefined
      const lanHosts = getLanIPv4Hosts()
      const candidateHosts = ['localhost', '127.0.0.1', ...lanHosts]
      const originCandidates = candidateHosts.map(
        h => `${proto}://${h}${actualPort ? `:${actualPort}` : ''}`,
      )

      const html = renderDebugHtml({
        originCandidates,
        contract: ctx.contract,
      })

      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(html)
      return
    }

    next()
  })
}

function renderDebugHtml(params: { originCandidates: string[], contract: BridgeContract }) {
  const { originCandidates, contract } = params
  const originsJson = JSON.stringify(originCandidates)
  const contractJson = JSON.stringify(contract, null, 2)

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DevTo Vue Debug</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; color: #111827; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
    .origin { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
    button { border: 1px solid #d1d5db; background: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; }
    pre { background: #f9fafb; padding: 10px; border-radius: 6px; overflow: auto; font-size: 12px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  </style>
</head>
<body>
  <h1>DevTo Vue Debug</h1>
  <div class="card">
    <div><strong>Set origin in host</strong></div>
    <div id="origin-list"></div>
    <pre id="origin-cmd"></pre>
  </div>
  <div class="card">
    <div><strong>Contract</strong></div>
    <pre>${contractJson}</pre>
  </div>
  <script>
    const origins = ${originsJson};
    const list = document.getElementById('origin-list');
    const cmd = document.getElementById('origin-cmd');

    function makeCmd(origin) {
      return "localStorage.setItem('VITE_DEV_SERVER_ORIGIN', '" + origin + "'); location.reload();";
    }

    function setCmd(origin) {
      cmd.textContent = makeCmd(origin);
    }

    function copy(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve();
    }

    origins.forEach(origin => {
      const row = document.createElement('div');
      row.className = 'origin';
      const code = document.createElement('code');
      code.textContent = origin;
      const btn = document.createElement('button');
      btn.textContent = 'Copy';
      btn.onclick = () => {
        setCmd(origin);
        copy(makeCmd(origin));
      };
      row.appendChild(code);
      row.appendChild(btn);
      list.appendChild(row);
    });

    if (origins[0]) setCmd(origins[0]);
  </script>
</body>
</html>`
}
