import type { BuildOptions, CSSOptions } from 'vite'

export interface DevToVuePluginOptions {
  css?: CSSOptions | false
  build?: BuildOptions
  open?: boolean
}

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
    vueRuntime: string
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
