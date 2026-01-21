import {
  PLUGIN_LOG_PREFIX,
  STABLE_CONTRACT_PATH,
  STABLE_DEBUG_HTML_PATH,
} from './constants.js'

import {
  DEV_TO_VUE_CONTRACT_KEY,
  DEV_TO_VUE_DEBUG_STATE_KEY,
  DEV_TO_VUE_ORIGIN_KEY,
  DEV_TO_VUE_RESOLVE_ASSET_KEY,
} from '@dev-to/shared'

import type { BridgeContract } from './types.js'

export function createContractVirtualModuleCode(contract: BridgeContract) {
  return `
    const CONTRACT = ${JSON.stringify(contract)};
    const ORIGIN = new URL(import.meta.url).origin;
    const G = typeof globalThis !== 'undefined' ? globalThis : window;
    const DEBUG_KEY = ${JSON.stringify(DEV_TO_VUE_DEBUG_STATE_KEY)};
    const STATE = (G[DEBUG_KEY] ||= { logged: {} });
    if (!STATE.logged.contract) {
      STATE.logged.contract = true;
      console.groupCollapsed('${PLUGIN_LOG_PREFIX} contract loaded');
      console.log('Origin:', ORIGIN);
      console.log('Paths:', CONTRACT.paths);
      console.log('Events:', CONTRACT.events);
      console.log('Components:', Object.keys(CONTRACT?.dev?.componentMap || {}));
      console.log('Tip: open', ORIGIN + '${STABLE_DEBUG_HTML_PATH}');
      console.groupEnd();
    }
    export const DEV_TO_VUE_CONTRACT = CONTRACT;
    export default CONTRACT;
  `
}

export function createInitVirtualModuleCode() {
  const contractExportName = 'DEV_TO_VUE_CONTRACT'
  const globalKey = DEV_TO_VUE_CONTRACT_KEY

  return `
    import "/@vite/client";

    import CONTRACT, { ${contractExportName} as CONTRACT_NAMED } from "${STABLE_CONTRACT_PATH}";

    {
      const ORIGIN = new URL(import.meta.url).origin;
      const G = typeof globalThis !== 'undefined' ? globalThis : window;
      const DEBUG_KEY = ${JSON.stringify(DEV_TO_VUE_DEBUG_STATE_KEY)};
      const STATE = (G[DEBUG_KEY] ||= { logged: {} });
      if (!STATE.logged.init) {
        STATE.logged.init = true;
        console.groupCollapsed('${PLUGIN_LOG_PREFIX} init loaded (HMR enabled)');
        console.log('Origin:', ORIGIN);
        console.log('This module imports /@vite/client.');
        console.groupEnd();
      }

      if (typeof window !== 'undefined') {
        window[${JSON.stringify(DEV_TO_VUE_ORIGIN_KEY)}] = ORIGIN;
        window[${JSON.stringify(DEV_TO_VUE_RESOLVE_ASSET_KEY)}] = (path) => {
          if (!path) return path;
          if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
            return path;
          }
          const origin = window[${JSON.stringify(DEV_TO_VUE_ORIGIN_KEY)}] || ORIGIN;
          return path.startsWith('/') ? origin + path : origin + '/' + path;
        };
      }
    }

    if (import.meta.hot) {
      import.meta.hot.accept();
      import.meta.hot.on('vite:beforeFullReload', () => {
        window.dispatchEvent(new CustomEvent(CONTRACT.events.fullReload));
      });
      import.meta.hot.on('vite:afterUpdate', (payload) => {
        payload.updates.forEach(update => {
          window.dispatchEvent(new CustomEvent(CONTRACT.events.hmrUpdate, {
            detail: { file: update.path, timestamp: payload.timestamp }
          }));
        });
      });
    }

    export const ${contractExportName} = CONTRACT_NAMED || CONTRACT;
    if (typeof window !== 'undefined') {
      window[${JSON.stringify(globalKey)}] = CONTRACT;
    }
    export default CONTRACT;
  `
}

export function createVueRuntimeVirtualModuleCode() {
  return `
    import * as Vue from "vue";
    {
      const ORIGIN = new URL(import.meta.url).origin;
      const G = typeof globalThis !== 'undefined' ? globalThis : window;
      const DEBUG_KEY = ${JSON.stringify(DEV_TO_VUE_DEBUG_STATE_KEY)};
      const STATE = (G[DEBUG_KEY] ||= { logged: {} });
      if (!STATE.logged.runtime) {
        STATE.logged.runtime = true;
        console.groupCollapsed('${PLUGIN_LOG_PREFIX} vue-runtime loaded');
        console.log('Origin:', ORIGIN);
        console.log('Vue.version:', Vue?.version);
        console.groupEnd();
      }
    }
    export { Vue };
    export default Vue;
  `
}
