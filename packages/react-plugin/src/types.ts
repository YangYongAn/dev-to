import type { BuildOptions, CSSOptions } from 'vite'

/**
 * Plugin options for dev-to React plugin
 *
 * @example
 * ```typescript
 * devToReactPlugin('Button', {
 *   css: { modules: { localsConvention: 'camelCase' } },
 *   open: true,
 * })
 * ```
 */
export interface DevToReactPluginOptions {
  /**
   * CSS configuration passed to Vite (applies in both dev and build modes).
   *
   * By default, stable CSS Modules naming rule is provided:
   * `[name]__[local]___[hash:base64:5]`
   *
   * - `false`: Disable all CSS configuration injected by the plugin
   * - `CSSOptions`: Deep merge with plugin's default configuration (user config takes precedence)
   *
   * @example
   * ```typescript
   * // Custom CSS Modules naming
   * { css: { modules: { localsConvention: 'camelCase' } } }
   *
   * // Disable CSS configuration
   * { css: false }
   * ```
   */
  css?: CSSOptions | false

  /**
   * Build configuration passed to Vite (only applies when running `dev-to build` / `vite build --mode lib`).
   *
   * Typical use cases:
   * - Adjust asset inlining: `assetsInlineLimit`
   * - Configure rollup: `rollupOptions`
   * - Configure minification/output: `minify` / `sourcemap` / `target` etc.
   *
   * This config will be deep merged with the plugin's internal `next.build` config
   * (user config takes precedence).
   *
   * @example
   * ```typescript
   * {
   *   build: {
   *     assetsInlineLimit: 0,
   *     rollupOptions: { external: ['react', 'react-dom'] }
   *   }
   * }
   * ```
   */
  build?: BuildOptions

  /**
   * Whether to automatically open the debug panel in browser after starting dev server.
   *
   * @default false
   *
   * @example
   * ```typescript
   * { open: true } // Opens debug panel automatically
   * ```
   */
  open?: boolean
}

/**
 * Component configuration input type
 *
 * Can be one of:
 * - `string`: Single component name used as wildcard pattern
 * - `Record<string, string>`: Map of component names to their file paths
 * - `undefined` or `null`: Use default entry point
 *
 * @example
 * ```typescript
 * // Single component
 * 'Button'
 *
 * // Multiple components
 * {
 *   Button: 'src/Button.tsx',
 *   Dialog: 'src/Dialog.tsx',
 * }
 *
 * // Default entry
 * undefined
 * ```
 */
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
