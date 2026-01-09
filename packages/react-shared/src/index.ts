/**
 * DevTo unified namespace.
 *
 * - Used to build framework-agnostic bridge URLs (e.g. `/__dev_to__/discovery.json`)
 * - Supports multi-framework expansion (react, vue, svelte, etc.)
 */
export const DEV_TO_NAMESPACE = 'dev_to' as const

/** Base path for all DevTo unified endpoints served by the dev server. */
export const DEV_TO_BASE_PATH = `/__${DEV_TO_NAMESPACE}__` as const

/** Unified discovery endpoint (framework-agnostic). */
export const DEV_TO_DISCOVERY_PATH = `${DEV_TO_BASE_PATH}/discovery.json` as const

/** Framework-agnostic debug endpoints. */
export const DEV_TO_DEBUG_HTML_PATH = `${DEV_TO_BASE_PATH}/debug.html` as const
export const DEV_TO_DEBUG_JSON_PATH = `${DEV_TO_BASE_PATH}/debug.json` as const

/**
 * React-specific namespace.
 *
 * - Used for React framework-specific paths (e.g. `/__dev_to__/react/init.js`)
 * - Used as event name prefix (e.g. `dev_to:react:full-reload`)
 */
export const DEV_TO_REACT_NAMESPACE = 'react' as const

/** Base path for React-specific bridge endpoints. */
export const DEV_TO_REACT_BASE_PATH = `${DEV_TO_BASE_PATH}/${DEV_TO_REACT_NAMESPACE}` as const

/** React bridge endpoints (served by `@dev-to/react-plugin` on the Vite dev server). */
export const DEV_TO_REACT_CONTRACT_PATH = `${DEV_TO_REACT_BASE_PATH}/contract.js` as const
export const DEV_TO_REACT_INIT_PATH = `${DEV_TO_REACT_BASE_PATH}/init.js` as const
export const DEV_TO_REACT_RUNTIME_PATH = `${DEV_TO_REACT_BASE_PATH}/runtime.js` as const
export const DEV_TO_REACT_LOADER_UMD_PATH = `${DEV_TO_REACT_BASE_PATH}/loader.js` as const
export const DEV_TO_REACT_LOADER_BASE_PATH = `${DEV_TO_REACT_BASE_PATH}/loader` as const

/** Events dispatched by the React bridge runtime (`init.js`). */
export const DEV_TO_REACT_EVENT_FULL_RELOAD = `${DEV_TO_NAMESPACE}:${DEV_TO_REACT_NAMESPACE}:full-reload` as const
export const DEV_TO_REACT_EVENT_HMR_UPDATE = `${DEV_TO_NAMESPACE}:${DEV_TO_REACT_NAMESPACE}:hmr-update` as const

/** Global keys used by bridge runtime on `window` / `globalThis`. */
export const DEV_TO_REACT_DEBUG_STATE_KEY = '__DEV_TO_REACT_DEBUG__' as const
export const DEV_TO_REACT_ORIGIN_KEY = '__DEV_TO_REACT_ORIGIN__' as const
export const DEV_TO_REACT_RESOLVE_ASSET_KEY = '__DEV_TO_REACT_RESOLVE_ASSET__' as const
export const DEV_TO_REACT_CONTRACT_KEY = '__DEV_TO_REACT_CONTRACT__' as const
export const DEV_TO_REACT_DID_OPEN_BROWSER_KEY = '__DEV_TO_REACT_DID_OPEN_BROWSER__' as const

/**
 * Unified discovery contract interface (framework-agnostic).
 * Served by the `/__dev_to__/discovery.json` endpoint.
 */
export interface DevToDiscoveryContract {
  /** Framework identification. */
  framework: {
    type: 'react' | 'vue' | 'svelte' | 'solid'
    version: string
  }
  /** Development server metadata. */
  server: {
    host: string
    port: number
    protocol: 'http' | 'https'
    /** All valid origin candidates (localhost, 127.0.0.1, LAN IPs). */
    origins: string[]
  }
  /** Available endpoints (framework-specific paths). */
  endpoints: {
    discovery: string
    contract: string
    init: string
    runtime: string
    debug: {
      html: string
      json: string
    }
    loader: {
      base: string
      umd: string
    }
  }
  /** Component registry. */
  components: Record<
    string,
    {
      name: string
      entry: string
      framework: string
    }
  >
  /** HMR events (framework-specific). */
  events: {
    fullReload: string
    hmrUpdate: string
  }
  /** Protocol version for compatibility. */
  protocol: {
    version: string
    apiLevel: number
  }
}

/**
 * Legacy React bridge contract interface.
 * Served by `/__dev_to__/react/contract.js` (for backward compatibility).
 */
export interface DevToReactBridgeContract {
  paths: {
    contract?: string
    initClient?: string
    reactRuntime: string
  }
  events: {
    fullReload: string
    hmrUpdate: string
  }
  dev?: {
    componentMap?: Record<string, string>
  }
}
