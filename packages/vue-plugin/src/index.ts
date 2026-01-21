export { devToVuePlugin } from './plugin.js'
export { createLoaderUmdWrapper } from './loaderUmdWrapper.js'
export { renderDebugHtml } from './debugHtml.js'
export {
  generateLibBuildNextConfig,
  generateLibVirtualEntryCode,
  getLibVirtualEntryPath,
  isLibBuild,
  normalizeLibCss,
  resolveBuildTargets,
  toSafeOutDirName,
  toSafeUmdName,
} from './libBuildUtils.js'

export type {
  DevComponentMapInput,
  DevToVuePluginOptions,
} from './types.js'
export type { DebugHtmlRenderParams, ViteServerConfigLite } from './debugHtml.js'
