/**
 * DevTo React bridge namespace.
 *
 * - Used to build stable bridge URLs (e.g. `/__dev_to_react__/contract.js`)
 * - Used as event name prefix (e.g. `dev_to_react:full-reload`)
 * - Reserved for future multi-framework expansion (e.g. `dev_to_vue`, etc.)
 */
export const DEV_TO_REACT_NAMESPACE = 'dev_to_react' as const

/** Base path for all DevTo React bridge endpoints served by the dev server. */
export const DEV_TO_REACT_BASE_PATH = `/__${DEV_TO_REACT_NAMESPACE}__` as const

/** Bridge endpoints (served by `@dev-to/react-plugin` on the Vite dev server). */
export const DEV_TO_REACT_CONTRACT_PATH = `${DEV_TO_REACT_BASE_PATH}/contract.js` as const
export const DEV_TO_REACT_INIT_PATH = `${DEV_TO_REACT_BASE_PATH}/init.js` as const
export const DEV_TO_REACT_REACT_RUNTIME_PATH = `${DEV_TO_REACT_BASE_PATH}/react-runtime.js` as const
export const DEV_TO_REACT_DEBUG_HTML_PATH = `${DEV_TO_REACT_BASE_PATH}/debug.html` as const
export const DEV_TO_REACT_DEBUG_JSON_PATH = `${DEV_TO_REACT_BASE_PATH}/debug.json` as const

/** Events dispatched by the bridge runtime (`init.js`). */
export const DEV_TO_REACT_EVENT_FULL_RELOAD = `${DEV_TO_REACT_NAMESPACE}:full-reload` as const
export const DEV_TO_REACT_EVENT_HMR_UPDATE = `${DEV_TO_REACT_NAMESPACE}:hmr-update` as const

/** Global keys used by bridge runtime on `window` / `globalThis`. */
export const DEV_TO_REACT_DEBUG_STATE_KEY = '__DEV_TO_REACT_DEBUG__' as const
export const DEV_TO_REACT_ORIGIN_KEY = '__DEV_TO_REACT_ORIGIN__' as const
export const DEV_TO_REACT_RESOLVE_ASSET_KEY = '__DEV_TO_REACT_RESOLVE_ASSET__' as const
export const DEV_TO_REACT_CONTRACT_KEY = '__DEV_TO_REACT_CONTRACT__' as const
export const DEV_TO_REACT_DID_OPEN_BROWSER_KEY = '__DEV_TO_REACT_DID_OPEN_BROWSER__' as const

/** Contract shape exported by `/__dev_to_react__/contract.js`. */
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
