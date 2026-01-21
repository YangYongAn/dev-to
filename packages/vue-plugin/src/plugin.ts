import path from 'node:path'

import { mergeConfig, type ConfigEnv, type Plugin, type UserConfig } from 'vite'

import {
  EVENT_FULL_RELOAD,
  EVENT_HMR_UPDATE,
  PLUGIN_LOG_PREFIX,
  PLUGIN_NAME,
  STABLE_CONTRACT_PATH,
  STABLE_INIT_PATH,
  STABLE_VUE_RUNTIME_PATH,
} from './constants.js'
import { installDebugTools } from './debugTools.js'
import { resolveDevComponentConfig, toViteFsPath } from './devComponentMap.js'
import { transformAssetUrl, transformViteDevCssAssetUrls } from './transformUtils.js'
import {
  createContractVirtualModuleCode,
  createInitVirtualModuleCode,
  createVueRuntimeVirtualModuleCode,
} from './virtualModules.js'

import type {
  BridgeContract,
  BridgeStats,
  DebugStartupState,
  DevComponentMapInput,
  DevToVuePluginOptions,
} from './types.js'

export function devToVuePlugin(
  components?: DevComponentMapInput,
  options?: DevToVuePluginOptions,
): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  const componentsMap = components ?? {}
  const opts = options ?? {}
  const stats: BridgeStats = {
    contract: { count: 0, lastAt: 0 },
    init: { count: 0, lastAt: 0 },
    runtime: { count: 0, lastAt: 0 },
  }
  const debugState: DebugStartupState = { didPrintStartupDebugUrl: false }

  let configDir = process.cwd()
  let currentRootDir = configDir
  let resolvedConfig = resolveDevComponentConfig(currentRootDir, componentsMap, configDir)

  const createContract = (
    componentMap: Record<string, string>,
    defaultEntryAbs: string,
    isDevMode = false,
  ): BridgeContract => {
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
        vueRuntime: STABLE_VUE_RUNTIME_PATH,
      },
      events: { fullReload: EVENT_FULL_RELOAD, hmrUpdate: EVENT_HMR_UPDATE },
      dev: { componentMap: processedComponentMap },
    }
  }

  let contract = createContract(
    resolvedConfig.componentMap,
    resolvedConfig.defaultEntryAbs,
    true,
  )
  const corePlugin: Plugin = {
    name: '@dev-to/vue-plugin',
    enforce: 'pre',

    configureServer(server) {
      contract = createContract(
        resolvedConfig.componentMap,
        resolvedConfig.defaultEntryAbs,
        true,
      )

      if (
        Object.keys(resolvedConfig.componentMap).length === 1
        && resolvedConfig.componentMap['*'] === '/'
      ) {
        const warn = server.config.logger?.warn?.bind(server.config.logger) ?? console.warn
        warn('')
        warn(
          `Warning: ${PLUGIN_LOG_PREFIX} No componentName configured. This works in dev mode but should be explicit for production builds.`,
        )
        warn(
          `Use devToVuePlugin({ ComponentName: "src/ComponentName.vue" }) or devToVuePlugin({ ComponentName: "/" }).`,
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
        const isDev = env.command !== 'build'
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

      return next
    },

    configResolved(resolved) {
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

    resolveId(source) {
      if (source.includes(STABLE_CONTRACT_PATH)) return `\0virtual:${PLUGIN_NAME}-contract`
      if (source.includes(STABLE_INIT_PATH)) return `\0virtual:${PLUGIN_NAME}-init`
      if (source.includes(STABLE_VUE_RUNTIME_PATH)) return `\0virtual:${PLUGIN_NAME}-vue-runtime`
      return null
    },

    load(id) {
      if (id === `\0virtual:${PLUGIN_NAME}-contract`)
        return createContractVirtualModuleCode(contract)
      if (id === `\0virtual:${PLUGIN_NAME}-init`) return createInitVirtualModuleCode()
      if (id === `\0virtual:${PLUGIN_NAME}-vue-runtime`)
        return createVueRuntimeVirtualModuleCode()
      return null
    },

    transform(code, id) {
      return transformAssetUrl(code, id)
    },
  }

  const devCssAssetPlugin: Plugin = {
    name: '@dev-to/vue-plugin:dev-css-asset-url',
    enforce: 'post',
    transform(code, id) {
      return transformViteDevCssAssetUrls(code, id)
    },
  }

  return [corePlugin, devCssAssetPlugin]
}
