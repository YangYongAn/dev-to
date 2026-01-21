import fs from 'node:fs'
import path from 'node:path'

import {
  EVENT_FULL_RELOAD,
  EVENT_HMR_UPDATE,
  PLUGIN_LOG_PREFIX,
  PLUGIN_NAME,
  STABLE_CONTRACT_PATH,
  STABLE_DEBUG_JSON_PATH,
  STABLE_INIT_PATH,
  STABLE_VUE_RUNTIME_PATH,
} from './constants.js'

import type { BridgeStats, DevComponentAudit } from './types.js'

export interface ViteServerConfigLite {
  host: unknown
  port?: number
  strictPort?: boolean
  cors?: unknown
  https: boolean
}

export interface DebugHtmlRenderParams {
  audit: DevComponentAudit
  resolvedDevComponentMap: Record<string, string>
  entryPathMap?: Record<string, string>
  stats: BridgeStats
  serverConfigLite: ViteServerConfigLite
  originCandidates: string[]
  actualPort: number | undefined
  configFilePath?: string
}

export function renderDebugHtml(params: DebugHtmlRenderParams) {
  const {
    resolvedDevComponentMap,
    entryPathMap = {},
    audit,
    stats,
    originCandidates,
    actualPort,
    configFilePath,
  } = params

  const { defaultEntryAbs, defaultEntryExists, componentMapCount } = audit
  const hasConfig = Object.keys(resolvedDevComponentMap).length > 0
  const isWildcardOnly
    = hasConfig && Object.keys(resolvedDevComponentMap).length === 1 && resolvedDevComponentMap['*']

  // 获取项目根目录 (通常是配置文件所在目录)
  const projectRoot = configFilePath ? path.dirname(configFilePath) : process.cwd()
  const projectRootDisplay = projectRoot.replace(/\\/g, '/')

  const getShortPath = (absPath: string) => {
    try {
      const rel = path.relative(projectRoot, absPath).replace(/\\/g, '/')
      return rel.startsWith('.') ? rel : `./${rel}`
    }
    catch {
      return absPath
    }
  }

  const toVsCodeUrl = (p: string) => `vscode://file/${p.replace(/\\/g, '/')}`
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 读取配置文件内容并添加解析注释
  const annotatedConfigHtml = (() => {
    if (!configFilePath || !fs.existsSync(configFilePath)) return ''
    try {
      const content = fs.readFileSync(configFilePath, 'utf-8')
      const lines: string[] = []
      const dim = (s: string) => `<span class="cmt-dim">${escapeHtml(s)}</span>`
      const map = (s: string) => `<span class="cmt-mapping">${escapeHtml(s)}</span>`

      lines.push(dim('/**'))
      lines.push(dim(` * ${PLUGIN_NAME} 解析结果:`))
      lines.push(
        dim(
          ` *   - 默认入口: ${getShortPath(defaultEntryAbs)} (${defaultEntryExists ? '存在' : '缺失'})`,
        ),
      )
      lines.push(dim(' *   - 组件映射解析 (Resolved Component Map):'))

      Object.entries(resolvedDevComponentMap).forEach(([name, entry]) => {
        lines.push(map(` *     - ${name} -> ${entry}`))
      })

      lines.push(dim(' */'))
      return `${lines.join('\n')}\n\n${escapeHtml(content)}`
    }
    catch (e) {
      return escapeHtml(`// ${PLUGIN_LOG_PREFIX} 无法读取配置文件: ${e}`)
    }
  })()

  return `<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${PLUGIN_NAME} Debug</title>
    <style>
        :root { --p: #42b883; --t: #1e293b; --m: #64748b; --b: #e2e8f0; --r: 12px; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, system-ui, sans-serif; background: #f8fafc; color: #1a202c; margin: 0; padding: 24px; line-height: 1.6; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header, .card { background: #fff; border-radius: var(--r); border: 1px solid var(--b); margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .header { padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; }
        .card { padding: 24px; }
        .header h1 { margin: 0; font-size: 24px; color: var(--t); }
        .header p, .muted { color: var(--m); font-size: 14px; margin: 4px 0 0; }
        .header-status { display: flex; gap: 12px; flex-wrap: wrap; }
        .status-pill { border: 1px solid var(--b); font-weight: 500; display: flex; align-items: center; background: #f8fafc; padding: 6px 16px; border-radius: 20px; font-size: 13px; color: #475569; }
        .status-pill b { color: var(--t); margin-left: 6px; }
        .card h3 { margin: 0 0 20px; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: var(--t); }
        .card h3::before { content: ''; width: 3px; height: 16px; background: var(--p); border-radius: 2px; }

        .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; display: flex; align-items: center; gap: 10px; border: 1px solid transparent; }
        .alert-info { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
        .alert-error { background: #fef2f2; color: #991b1b; border-color: #fee2e2; }
        .alert-warning { background: #fffbeb; color: #92400e; border-color: #fef3c7; }

        .setup-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; margin: 12px 0 20px; }
        .setup-card {
            background: #fff; border: 1.5px solid var(--b); border-radius: 8px; padding: 10px 14px;
            transition: all .2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; display: flex; flex-direction: column;
        }
        .setup-card:hover { border-color: var(--p); background: #f0fdf4; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .setup-card.active { border-color: var(--p); background: #f0fdf4; }
        .setup-card .type { font-size: 9px; text-transform: uppercase; color: var(--m); font-weight: 700; margin-bottom: 6px; display: inline-flex; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; width: fit-content; }
        .setup-card.active .type { background: #dcfce7; color: var(--p); }
        .setup-card .url { font-family: SFMono-Regular, Consolas, monospace; font-size: 13px; color: var(--t); font-weight: 600; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%; }
        .setup-card .action { font-size: 11px; color: var(--m); display: flex; align-items: center; gap: 4px; margin-top: auto; }
        .setup-card:hover .action, .setup-card.active .action { color: var(--p); }

        .manual-box { background: #fcfdfe; border: 1px solid var(--b); border-radius: 8px; margin-top: 16px; overflow: hidden; }
        .manual-header { padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; color: var(--m); font-size: 11px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid var(--b); }
        .copy-btn-link { background: #fff; border: 1px solid var(--b); color: var(--t); padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: .2s; }
        .copy-btn-link:hover { border-color: var(--p); color: var(--p); }
        #fullCmdPreview { margin: 0; padding: 14px 16px; border: none; background: transparent; }

        .info-grid { display: grid; grid-template-columns: 100px 1fr; gap: 12px 16px; margin-bottom: 24px; align-items: baseline; font-size: 13px; }
        .info-label { color: var(--m); font-weight: 500; }

        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden; }
        th, td { text-align: left; padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
        th { background: #f8fafc; color: var(--m); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
        code, pre { font-family: SFMono-Regular, Consolas, monospace; font-size: .9em; }
        code { background: #f1f5f9; padding: 3px 6px; border-radius: 4px; color: #475569; font-weight: 500; }
        .code-name { color: #42b883; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .link-code { color: #42b883; text-decoration: none; padding: 2px 6px; border-radius: 4px; transition: .2s; display: inline-flex; align-items: center; gap: 4px; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .link-code:hover { background: #dcfce7; color: #166534; border-color: #86efac; }
        .link-code code { background: 0 0; padding: 0; color: inherit; }
        .link-code::after { content: '\\2197'; font-size: 11px; opacity: .6; }
        details { margin-top: 16px; border: 1px solid #f1f5f9; border-radius: 10px; padding: 12px 16px; background: #fafbfc; }
        summary { cursor: pointer; color: #475569; font-size: 14px; font-weight: 600; outline: 0; }
        summary:hover { color: var(--p); }

        pre { background: #f0fdf4; color: #2d3748; padding: 14px 16px; border-radius: 8px; font-size: 12px; border: 1px solid var(--b); margin: 12px 0; line-height: 1.6; overflow-x: auto; }
        .cmt { color: #718096; font-style: italic; }
        .kw { color: #42b883; font-weight: 600; }
        .str { color: #059669; }
        .val { color: #d97706; }

        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .stat-card { background: #f8fafc; padding: 20px; border-radius: 10px; text-align: center; border: 1px solid #f1f5f9; }
        .stat-card .value { font-size: 24px; font-weight: 700; color: var(--p); margin-bottom: 4px; }
        .stat-card .label { font-size: 12px; color: var(--m); text-transform: uppercase; font-weight: 600; }
        .parameter-item { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px dashed var(--b); }
        .parameter-item:last-child { border-bottom: none; }
        .parameter-name { font-weight: 600; color: var(--t); margin-bottom: 6px; display: block; font-size: 14px; }
        .info-value, .parameter-info { font-size: 13px; color: #4a5568; line-height: 1.7; }
        .cmt-dim { opacity: 0.4; }
        .cmt-mapping { color: var(--p); font-weight: 600; }

        /* 响应式优化：移动端 (480px以下) */
        @media (max-width: 480px) {
            body { padding: 12px; }
            .header { padding: 16px; flex-direction: column; align-items: flex-start; gap: 16px; }
            .header-status { width: 100%; gap: 8px; }
            .status-pill { padding: 4px 12px; font-size: 12px; }
            .card { padding: 16px; }
            .info-grid { grid-template-columns: 1fr; gap: 4px; }
            .info-label { font-size: 12px; margin-bottom: 2px; }
            .stats-grid { grid-template-columns: 1fr; }
            .stat-card { padding: 12px; }
            .stat-card .value { font-size: 20px; }
            table { display: table; width: 100%; border-radius: 6px; }
            th, td { padding: 10px 8px; font-size: 12px; white-space: normal; overflow-wrap: anywhere; word-break: normal; }
            th br, th .muted { display: none; }
            pre { padding: 10px; font-size: 11px; }
            .setup-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
            .setup-card { padding: 8px 10px; }
            .setup-card .url { font-size: 12px; margin-bottom: 4px; }
            .setup-card .action { font-size: 10px; }
            .build-grid { grid-template-columns: 1fr !important; }
        }

        .build-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
        .build-card { background:#f8fafc; padding:16px; border-radius:10px; border:1px solid #edf2f7; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-main">
                <h1>${PLUGIN_NAME}</h1>
                <p>Vue 组件开发调试面板 - Vite ESM + HMR</p>
            </div>
            <div class="header-status">
                <div class="status-pill">组件<b>${componentMapCount}</b></div>
                <div class="status-pill">入口<b style="color: ${defaultEntryExists ? '#10b981' : '#ef4444'}">${defaultEntryExists ? '✓' : '✗'}</b></div>
                <div class="status-pill">端口<b id="actualPortDisplay">-</b></div>
            </div>
        </div>

        <div class="card">
            <h3>环境快速设置</h3>
            <div class="alert alert-info">
                <span></span>
                <div>在宿主 Electron 的控制台 (DevTools Console) 执行下方卡片中的命令，即可完成环境切换。</div>
            </div>

            <div id="originGrid" class="setup-grid"></div>

            <div class="manual-box">
                <div class="manual-header">
                    <span>手动复制完整脚本</span>
                    <button id="copyFullCmd" class="copy-btn-link">复制原始命令</button>
                </div>
                <pre id="fullCmdPreview"></pre>
            </div>
        </div>

        <div class="card">
            <h3>当前组件配置</h3>

            <div class="info-grid">
                <div class="info-label">项目目录:</div>
                <div class="info-value">
                    <a href="${toVsCodeUrl(projectRoot)}" class="link-code" title="点击在 IDE 中打开"><code>${escapeHtml(projectRootDisplay)}</code></a>
                </div>
                <div class="info-label">配置文件:</div>
                <div class="info-value">
                    ${
                      configFilePath
                        ? `
                        <a href="${toVsCodeUrl(configFilePath)}" class="link-code" title="点击在 IDE 中打开"><code>${escapeHtml(path.basename(configFilePath))}</code></a>
                        ${
                          annotatedConfigHtml
                            ? `
                            <details style="margin-top: 8px; border: none; padding: 0; background: transparent; box-shadow: none;">
                                <summary style="font-size: 12px; color: var(--p); font-weight: 500;">查看配置源码与解析结果</summary>
                                <pre style="margin-top: 8px; max-height: 400px; overflow: auto; background: #f1f5f9; border-color: #cbd5e1; font-size: 11px; padding: 12px; border-radius: 6px;">${annotatedConfigHtml}</pre>
                            </details>
                        `
                            : ''
                        }
                    `
                        : '<span class="muted">未找到</span>'
                    }
                </div>
            </div>

            ${
              !hasConfig || isWildcardOnly
                ? `
                <div class="alert alert-info">
                    <span></span>
                    <div>
                        <b>全局通配模式已启用</b>
                        <div style="font-size: 13px; margin-top: 2px;">Map 中包含通配符 "*"。所有组件请求将默认加载入口。构建前请在 <code>vite.config.ts</code> 中显式指定组件映射。</div>
                    </div>
                </div>
            `
                : ''
            }

            ${
              !defaultEntryExists
                ? `
                <div class="alert alert-error">
                    <span></span>
                    <div>
                        <b>默认入口文件缺失</b>
                        <div style="font-size: 13px; margin-top: 2px;">找不到路径：<a href="${toVsCodeUrl(defaultEntryAbs)}" class="link-code"><code>${escapeHtml(getShortPath(defaultEntryAbs))}</code></a></div>
                    </div>
                </div>
            `
                : ''
            }

            ${
              hasConfig
                ? `
                <table>
                    <thead><tr><th>组件名称 <small class="muted">(Component Name)</small></th><th>映射入口 <small class="muted">(Short Path)</small></th><th>包装地址 <small class="muted">(UMD Wrapper)</small></th></tr></thead>
                    <tbody>
                        ${Object.entries(resolvedDevComponentMap)
                          .map(([name, entry]) => {
                            const abs = entryPathMap[name]
                            const displayPath = abs ? getShortPath(abs) : entry
                            const wrapperUrl = (originCandidates[0] || 'http://localhost:5173') + '/__dev_to__/loader/' + name + '.js'
                            const entryHtml = abs ? '<a href="' + toVsCodeUrl(abs) + '" class="link-code" title="点击在 IDE 中打开"><code>' + escapeHtml(displayPath) + '</code></a>' : '<code>' + escapeHtml(entry) + '</code>'
                            return '<tr>'
                              + '<td><code class="code-name">' + name + '</code></td>'
                              + '<td>' + entryHtml + '</td>'
                              + '<td>'
                              + '<div style="display: flex; align-items: center; gap: 6px;">'
                              + '<code style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px;">' + escapeHtml(wrapperUrl) + '</code>'
                              + '<button class="copy-wrapper-btn" data-url="' + wrapperUrl + '" style="padding: 2px 8px; font-size: 11px; border: 1px solid var(--b); background: #fff; border-radius: 4px; cursor: pointer; color: var(--t); transition: .2s;" title="复制包装地址">Copy</button>'
                              + '</div>'
                              + '</td>'
                              + '</tr>'
                          })
                          .join('')}
                    </tbody>
                </table>
            `
                : '<div class="alert alert-warning">未发现任何配置组件</div>'
            }

            <details>
                <summary>插件参数与配置说明 (Plugin API)</summary>
                <div class="parameter-desc">
                    <div style="margin-bottom: 24px;">
                        <pre style="background: #f0fdf4; color: #166534; border-color: #bbf7d0; font-size: 14px; font-weight: 600;">devToVuePlugin(components?, options?)</pre>
                        <div class="muted" style="margin-top: 8px;">
                            支持单组件简写、对象全量映射，以及透传 Vite 原生配置。
                        </div>
                    </div>

                    <div class="parameter-item">
                        <span class="parameter-name">1. components (第一个参数)</span>
                        <div class="parameter-info">
                            定义组件名与本地入口文件的映射：
                            <ul style="margin-top: 8px;">
                                <li><b>单组件简写</b>：<code class="val">'Demo'</code> -> 自动关联 <code>{ Demo: '/' }</code>。</li>
                                <li><b>通配符映射</b>：<code class="val">'*'</code> -> 匹配所有组件名。支持 <code class="val">'/'</code> (默认入口) 或具体的相对/绝对路径。</li>
                                <li><b>多组件映射</b>：支持具体的相对/绝对路径。</li>
                            </ul>
                            <pre><span class="cmt">// Option 1: Shorthand (Default)</span>
devToVuePlugin(<span class="str">'Demo'</span>)

<span class="cmt">// Option 2: Explicit Mapping with Wildcard</span>
devToVuePlugin({
  <span class="str">'*'</span>: <span class="str">'/'</span>, <span class="cmt">// Wildcard to default entry</span>
  <span class="str">'Card'</span>: <span class="str">'src/Card.vue'</span> <span class="cmt">// Specific file</span>
})</pre>
                            <div class="muted" style="font-size: 12px; margin-top: 8px; background: #fffbeb; padding: 8px 12px; border-radius: 6px; border: 1px solid #fef3c7; color: #92400e;">
                                <b>关于默认入口 (/)</b>：表示使用工程默认入口文件。查找顺序：优先 <code>src/App.vue</code>，其次 <code>src/index.{vue,tsx,jsx}</code>。
                            </div>
                        </div>
                    </div>
                    <div class="parameter-item">
                        <span class="parameter-name">2. options (第二个参数)</span>
                        <div class="parameter-info">
                            高级配置（深度合并）：
                            <ul style="margin-top: 8px;">
                                <li><code class="kw">css</code>:
                                    <ul>
                                        <li><b>默认值：</b><code>{ modules: { generateScopedName: <span class="str">'[name]__[local]___[hash:base64:5]'</span> } }</code>。</li>
                                        <li>传 <code class="kw">false</code> 禁用配置；传对象则进行深度合并。</li>
                                        <li>详细配置请参考 <a href="https://cn.vite.dev/config/shared-options#css-modules" target="_blank" style="color:#42b883;">Vite CSS 官方文档</a></li>
                                    </ul>
                                    <pre><span class="cmt">// Disable plugin CSS config or provide custom overrides</span>
devToVuePlugin(<span class="str">'Demo'</span>, { css: <span class="kw">false</span> })
devToVuePlugin(<span class="str">'Demo'</span>, { css: { ... } })</pre>
                                </li>
                                <li style="margin-top: 12px;"><code class="kw">build</code>:
                                    <ul>
                                        <li><b>仅在 lib 构建模式下生效</b>。内置默认值：</li>
                                        <pre style="font-size: 11px; color: #4a5568;">formats: [<span class="str">'umd'</span>], fileName: <span class="str">'[name].js'</span>, inlineDynamicImports: <span class="kw">true</span>,
external: [<span class="str">'vue'</span>],
globals: { vue: <span class="str">'Vue'</span> }</pre>
                                        <li>合并规则：用户配置覆盖默认项。</li>
                                        <li>详细配置请参考 <a href="https://cn.vite.dev/config/build-options" target="_blank" style="color:#42b883;">Vite 构建官方文档</a></li>
                                    </ul>
                                    <pre><span class="cmt">// Example: Disable asset inlining during build</span>
devToVuePlugin(<span class="str">'Demo'</span>, {
  build: { assetsInlineLimit: <span class="val">0</span> }
})</pre>
                                </li>
                                <li style="margin-top: 12px;"><code class="kw">open</code>:
                                    <ul>
                                        <li><b>默认值：</b><code class="kw">false</code>。</li>
                                        <li>是否在启动 Vite 开发服务器后自动在浏览器中打开此调试面板。</li>
                                    </ul>
                                    <pre><span class="cmt">// Enable auto-open</span>
devToVuePlugin(<span class="str">'Demo'</span>, { open: <span class="kw">true</span> })</pre>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </details>
        </div>

        <div class="card">
            <h3>UMD 动态包装器 (Auto-Generated Wrapper)</h3>
            <p class="muted">无需额外配置，每个组件都自动生成一个轻量级 UMD 包装器，可直接在无 Vue 框架支持的宿主环境中使用。</p>

            <div class="info-grid">
                <div class="info-label">端点:</div>
                <div class="info-value"><code>/__dev_to__/loader/{ComponentName}.js</code></div>
                <div class="info-label">作用:</div>
                <div class="info-value">自动将组件导出为 Vue 组件实例，无需宿主集成 @dev-to/vue-loader</div>
                <div class="info-label">依赖:</div>
                <div class="info-value"><code>vue@3</code> (CDN 或本地)</div>
            </div>

            <details>
                <summary>包装器工作原理与集成示例</summary>
                <div style="margin-top: 12px;">
                    <h4 style="color: var(--t); font-size: 14px; margin-top: 0; margin-bottom: 8px;">什么是包装器？</h4>
                    <p class="muted" style="margin-bottom: 12px;">
                        包装器是一个自动生成的 UMD 模块，它包装了原始的 render 函数并导出为 Vue 组件。
                        这样，无论宿主是否集成了 VueLoader，都能直接作为 Vue 组件使用。
                    </p>

                    <h4 style="color: var(--t); font-size: 14px; margin-top: 16px; margin-bottom: 8px;">集成方式</h4>
                    <pre style="font-size: 12px; line-height: 1.7;">
<span class="cmt">// 1. 加载 Vue</span>
<span class="kw">&lt;script&gt;</span> <span class="kw">src</span>=<span class="str">"https://unpkg.com/vue@3/dist/vue.global.prod.js"</span> <span class="kw">&lt;/script&gt;</span>

<span class="cmt">// 2. 加载包装器脚本</span>
<span class="kw">&lt;script&gt;</span> <span class="kw">src</span>=<span class="str">"\${originCandidates[0] || 'http://localhost:5173'}/__dev_to__/loader/{ComponentName}.js"</span> <span class="kw">&lt;/script&gt;</span>

<span class="cmt">// 3. 直接作为 Vue 组件使用</span>
<span class="kw">const</span> app = Vue.createApp(window.ComponentName);
app.mount(<span class="str">'#app'</span>);

<span class="cmt">// 或在宿主 Vue 应用中使用</span>
<span class="kw">const</span> Component = window.ComponentName;
app.component(<span class="str">'MyComponent'</span>, Component);</pre>

                    <h4 style="color: var(--t); font-size: 14px; margin-top: 16px; margin-bottom: 8px;">关键特性</h4>
                    <ul class="muted" style="margin: 8px 0; padding-left: 20px;">
                        <li><b>零配置</b>：自动为每个组件生成包装器，无需手动编写</li>
                        <li><b>兼容现有宿主</b>：支持 CommonJS、AMD、浏览器全局三种模式</li>
                        <li><b>自动依赖管理</b>：若未加载 Vue，包装器会自动从 CDN 加载（可配置）</li>
                        <li><b>轻量级</b>：仅包含加载逻辑，核心渲染由 VueLoader 负责</li>
                    </ul>
                </div>
            </details>
        </div>

        <div class="card">
            <h3>构建与部署</h3>
            <p class="muted">执行 <code>dev-to build</code>（等价于 <code>vite build --mode lib</code>）将组件打包为 UMD 格式以供发布。</p>

            <div class="build-grid">
                <div class="build-card">
                    <div style="font-weight:600; font-size:13px; margin-bottom:8px; color: var(--t);">输出结构 (Output)</div>
                    <pre style="margin:0; padding:0; background:transparent; border:none; font-size:12px; color:#4a5568;">
JS:  <span class="str">dist/&lt;name&gt;/&lt;name&gt;.js</span>
CSS: <span class="str">dist/&lt;name&gt;/&lt;name&gt;.css</span></pre>
                </div>
                <div class="build-card">
                    <div style="font-weight:600; font-size:13px; margin-bottom:8px; color: var(--t);">外部依赖 (External)</div>
                    <pre style="margin:0; padding:0; background:transparent; border:none; font-size:12px; color:#4a5568;">
<span class="kw">vue</span> -> <span class="val">Vue</span></pre>
                </div>
            </div>

            <details>
                <summary>构建导出 (Export) 智能分析逻辑</summary>
                <div style="margin-top: 12px; font-size: 13px;">
                    <p class="muted">插件会使用 AST 分析入口文件，确保 UMD 包具备正确的导出：</p>
                    <ul class="muted" style="line-height: 1.8;">
                        <li>如果有 <code>export default</code>，直接作为组件入口。</li>
                        <li>如果没有 Default 但只有一个命名导出，自动将其关联为 Default。</li>
                        <li>如果有多个命名导出，必须有一个与 <code>componentName</code> 同名，否则会报错提醒。</li>
                    </ul>
                </div>
            </details>
        </div>

        <div class="card">
            <h3>运行指标 & 参考</h3>
            <div class="stats-grid">
                <div class="stat-card"><div class="value">${stats.contract.count}</div><div class="label">Contract 请求</div></div>
                <div class="stat-card"><div class="value">${stats.init.count}</div><div class="label">Init 注入</div></div>
                <div class="stat-card"><div class="value">${stats.runtime.count}</div><div class="label">Runtime 加载</div></div>
            </div>

            <details>
                <summary>技术端点与 HMR 事件 (Internal Reference)</summary>
                <div style="margin-top: 12px;">
                    <pre style="font-size: 12px; line-height: 1.7;">
<span class="kw">Endpoints:</span>
- Contract: <span class="str">${STABLE_CONTRACT_PATH}</span>
- Init:     <span class="str">${STABLE_INIT_PATH}</span>
- Runtime:  <span class="str">${STABLE_VUE_RUNTIME_PATH}</span>

<span class="kw">HMR Events:</span>
- Reload:   <span class="val">${EVENT_FULL_RELOAD}</span>
- Update:   <span class="val">${EVENT_HMR_UPDATE}</span></pre>
                    <p class="muted" style="font-size: 12px; margin-top: 12px; background: #fffbeb; padding: 10px 14px; border-radius: 6px; border: 1px solid #fef3c7; color: #92400e;">
                        <b>重要提示：</b>在 Electron 环境下，静态资源必须通过 <code>import</code> 引入才能被桥接插件正确拦截和路径重写。
                    </p>
                </div>
            </details>
        </div>

        <div style="text-align: center; margin-top: 32px; padding-bottom: 24px;">
            <a href="${STABLE_DEBUG_JSON_PATH}" target="_blank" style="font-size: 13px; color: #42b883; text-decoration: none; font-weight: 500;">查看原始协议 JSON 数据 -></a>
        </div>
    </div>

    <script>
        (function() {
            const serverOrigins = ${JSON.stringify(originCandidates)};
            const current = location.origin;
            const origins = [...serverOrigins];

            // 确保当前访问地址也在候选列表中
            if (!origins.includes(current)) origins.unshift(current);

            const seen = new Set();
            const uniqueOrigins = origins.filter(o => {
                if (seen.has(o)) return false;
                seen.add(o);
                return true;
            });

            const grid = document.getElementById('originGrid');
            const fullCmdPreview = document.getElementById('fullCmdPreview');
            const copyFullBtn = document.getElementById('copyFullCmd');

            function makeCmd(origin) {
                return "localStorage.setItem('VITE_DEV_SERVER_ORIGIN', '" + origin + "'); location.reload();";
            }

            function selectOrigin(origin, card) {
                // 更新卡片激活状态
                document.querySelectorAll('.setup-card').forEach(c => c.classList.remove('active'));
                if (card) card.classList.add('active');

                // 更新下方预览脚本
                fullCmdPreview.textContent = makeCmd(origin);
            }

            function copy(text, successCb) {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                if (successCb) successCb();
            }

            uniqueOrigins.forEach(origin => {
                const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
                const displayUrl = origin.indexOf('://') > -1 ? origin.split('://')[1] : origin;
                const card = document.createElement('div');
                card.className = 'setup-card' + (origin === current ? ' active' : '');
                card.innerHTML =
                    '<span class="type">' + (isLocal ? '本地回路 (Local)' : '局域网 (LAN)') + '</span>' +
                    '<span class="url">' + displayUrl + '</span>' +
                    '<div class="action">点击复制切换命令</div>';
                card.onclick = () => {
                    selectOrigin(origin, card);
                    copy(makeCmd(origin), () => {
                        const actionEl = card.querySelector('.action');
                        const originalAction = actionEl.innerHTML;
                        actionEl.innerHTML = '<span>OK</span> 命令已复制成功';
                        card.style.borderColor = '#10b981';
                        setTimeout(() => {
                            actionEl.innerHTML = originalAction;
                            card.style.borderColor = '';
                        }, 2000);
                    });
                };
                grid.appendChild(card);
            });

            selectOrigin(current, null); // 初始化预览
            copyFullBtn.onclick = () => copy(fullCmdPreview.textContent, () => {
                copyFullBtn.textContent = 'OK 已成功复制';
                setTimeout(() => { copyFullBtn.textContent = '复制原始命令'; }, 2000);
            });

            // 绑定包装地址复制按钮事件
            document.querySelectorAll('.copy-wrapper-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    const url = btn.getAttribute('data-url');
                    copy(url, () => {
                        const originalText = btn.textContent;
                        btn.textContent = 'OK';
                        btn.style.borderColor = '#10b981';
                        btn.style.color = '#10b981';
                        setTimeout(() => {
                            btn.textContent = originalText;
                            btn.style.borderColor = '';
                            btn.style.color = '';
                        }, 1500);
                    });
                };
                btn.onmouseover = () => { btn.style.borderColor = 'var(--p)'; btn.style.color = 'var(--p)'; };
                btn.onmouseout = () => { btn.style.borderColor = ''; btn.style.color = ''; };
            });

            const serverActualPort = ${typeof actualPort === 'number' ? actualPort : 'null'};
            document.getElementById('actualPortDisplay').textContent = serverActualPort || location.port || '-';
        })();
    </script>
</body>
</html>`
}
