import type { BuildOptions, CSSOptions } from 'vite'

export interface DevToReactPluginOptions {
  /**
   * 透传给 Vite 的 `css` 配置（开发与构建态均生效）。
   *
   * 默认提供稳定的 CSS Modules 命名规则：
   * `[name]__[local]___[hash:base64:5]`
   *
   * - 传 `false`：禁用插件注入的所有 CSS 配置
   * - 传对象：与插件默认配置深度合并
   */
  css?: CSSOptions | false

  /**
   * 透传给 Vite 的 `build` 配置（仅在 `vite build --mode lib` 时生效）。
   *
   * 典型用途：
   * - 调整资源内联：`assetsInlineLimit`
   * - 调整 rollup：`rollupOptions`
   * - 调整压缩/产物：`minify` / `sourcemap` / `target` 等
   *
   * 插件会将此配置与内部生成的 `next.build` 做深度合并（以这里传入的为准）。
   */
  build?: BuildOptions

  /**
   * 启动开发服务器后，是否自动在浏览器中打开调试面板。
   * @default false
   */
  open?: boolean
}

/** @deprecated Use `DevToReactPluginOptions` instead. */
export type ViteHostReactBridgePluginOptions = DevToReactPluginOptions

export type DevComponentMapInput = Record<string, string> | string | undefined | null

export interface DevComponentAudit {
  defaultEntryAbs: string
  defaultEntryExists: boolean
  componentMapCount: number
  missingEntries: Array<{ componentName: string, filePath: string }>
}

export interface ResolvedDevComponentConfig {
  defaultEntryAbs: string
  defaultEntry: string
  componentMap: Record<string, string>
  audit: DevComponentAudit
}

export interface BridgeStatsBucket {
  count: number
  lastAt: number
}

export interface BridgeStats {
  contract: BridgeStatsBucket
  init: BridgeStatsBucket
  runtime: BridgeStatsBucket
}

export interface BridgeContract {
  paths: {
    contract: string
    initClient: string
    reactRuntime: string
  }
  events: {
    fullReload: string
    hmrUpdate: string
  }
  dev: {
    componentMap: Record<string, string>
  }
}

export interface DebugStartupState {
  didPrintStartupDebugUrl: boolean
}
