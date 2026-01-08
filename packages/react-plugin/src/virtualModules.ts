import { PLUGIN_LOG_PREFIX, STABLE_CONTRACT_PATH, STABLE_DEBUG_HTML_PATH } from './constants.js'

import {
  DEV_TO_REACT_CONTRACT_KEY,
  DEV_TO_REACT_DEBUG_STATE_KEY,
  DEV_TO_REACT_ORIGIN_KEY,
  DEV_TO_REACT_RESOLVE_ASSET_KEY,
} from '@dev-to/react-shared'

import type { BridgeContract } from './types.js'

export function createContractVirtualModuleCode(contract: BridgeContract) {
  // 纯 contract：不 import /@vite/client、不装 react-refresh，避免仅做映射读取时就启动 HMR
  return `
    const CONTRACT = ${JSON.stringify(contract)};
    const ORIGIN = new URL(import.meta.url).origin;
    const G = typeof globalThis !== 'undefined' ? globalThis : window;
    const DEBUG_KEY = ${JSON.stringify(DEV_TO_REACT_DEBUG_STATE_KEY)};
    const STATE = (G[DEBUG_KEY] ||= { logged: {} });
    if (!STATE.logged.contract) {
      STATE.logged.contract = true;
      console.groupCollapsed('${PLUGIN_LOG_PREFIX} contract loaded');
      console.log('Origin:', ORIGIN);
      console.log('Paths:', CONTRACT.paths);
      console.log('Events:', CONTRACT.events);
      console.log('Dev mode:', CONTRACT?.dev?.mode);
      console.log('Default entry:', CONTRACT?.dev?.defaultEntry);
      console.log('devComponentMap keys:', Object.keys(CONTRACT?.dev?.componentMap || {}));
      console.log('Tip: open', ORIGIN + '${STABLE_DEBUG_HTML_PATH}');
      console.groupEnd();
    }
    export const DEV_TO_REACT_CONTRACT = CONTRACT;
    export default CONTRACT;
  `
}

export function createInitVirtualModuleCode() {
  const contractExportName = 'DEV_TO_REACT_CONTRACT'
  const globalKey = DEV_TO_REACT_CONTRACT_KEY

  return `
    import "/@vite/client";
    import RefreshRuntime from "/@react-refresh";

    import CONTRACT, { ${contractExportName} as CONTRACT_NAMED } from "${STABLE_CONTRACT_PATH}";

    if (typeof window !== 'undefined' && !window.__vite_plugin_react_preamble_installed__) {
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = (type, id) => RefreshRuntime.register(type, id);
      window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
      window.__vite_plugin_react_preamble_installed__ = true;
      console.log('${PLUGIN_LOG_PREFIX} React Refresh preamble installed.');
    }

    {
      const ORIGIN = new URL(import.meta.url).origin;
      const G = typeof globalThis !== 'undefined' ? globalThis : window;
      const DEBUG_KEY = ${JSON.stringify(DEV_TO_REACT_DEBUG_STATE_KEY)};
      const STATE = (G[DEBUG_KEY] ||= { logged: {} });
      if (!STATE.logged.init) {
        STATE.logged.init = true;
        console.groupCollapsed('${PLUGIN_LOG_PREFIX} init loaded (HMR enabled)');
        console.log('Origin:', ORIGIN);
        console.log('This module imports /@vite/client and installs react-refresh preamble.');
        console.log('Important: init must run BEFORE importing react-dom/client in the host.');
        console.log('Tip: open', ORIGIN + '${STABLE_DEBUG_HTML_PATH}');
        console.groupEnd();
      }

      // 设置全局 Vite 服务器 origin，用于静态资源 URL 转换
      // 在宿主页面（file:///Electron）中，静态资源的相对路径需要转换为完整 URL
      if (typeof window !== 'undefined') {
        window[${JSON.stringify(DEV_TO_REACT_ORIGIN_KEY)}] = ORIGIN;
        // 添加全局辅助函数，用于将相对路径转换为完整的 Vite 服务器 URL
        window[${JSON.stringify(DEV_TO_REACT_RESOLVE_ASSET_KEY)}] = (path) => {
          if (!path) return path;
          if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
            return path;
          }
          const origin = window[${JSON.stringify(DEV_TO_REACT_ORIGIN_KEY)}] || ORIGIN;
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

export function createReactRuntimeVirtualModuleCode() {
  // 给宿主侧（非 Vite 页面）提供稳定的 ESM 模块，直接从 Vite 侧拿到 React + ReactDOMClient
  return `
    import React from "react";
    import * as ReactDOMClient from "react-dom/client";
    {
      const ORIGIN = new URL(import.meta.url).origin;
      const G = typeof globalThis !== 'undefined' ? globalThis : window;
      const DEBUG_KEY = ${JSON.stringify(DEV_TO_REACT_DEBUG_STATE_KEY)};
      const STATE = (G[DEBUG_KEY] ||= { logged: {} });
      if (!STATE.logged.runtime) {
        STATE.logged.runtime = true;
        console.groupCollapsed('${PLUGIN_LOG_PREFIX} react-runtime loaded');
        console.log('Origin:', ORIGIN);
        console.log('React.version:', React?.version);
        console.log('ReactDOMClient keys:', Object.keys(ReactDOMClient || {}));
        console.log('Tip: open', ORIGIN + '${STABLE_DEBUG_HTML_PATH}');
        console.groupEnd();
      }
    }
    export { React, ReactDOMClient };
    export default React;
  `
}

/**
 * Generate loader wrapper code for a specific component.
 * This creates a pre-configured loader script that can be imported directly.
 */
export function createLoaderWrapperCode(params: {
  componentName: string
  origin: string
  contractEndpoint?: string
}) {
  const { componentName, origin, contractEndpoint = STABLE_CONTRACT_PATH } = params

  return `
    /**
     * Auto-generated ReactLoader wrapper for component: ${componentName}
     * Origin: ${origin}
     * Generated by ${PLUGIN_LOG_PREFIX}
     */

    // Configuration for loading the ${componentName} component
    export const loaderConfig = {
      origin: ${JSON.stringify(origin)},
      name: ${JSON.stringify(componentName)},
      contractEndpoint: ${JSON.stringify(contractEndpoint)},
    };

    /**
     * Factory function to create a loader configuration with custom props.
     * @param {object} componentProps - Props to pass to the component
     * @param {object} options - Additional loader options (loading, renderError, etc.)
     * @returns {object} Full ReactLoader configuration
     */
    export function createLoaderProps(componentProps = {}, options = {}) {
      return {
        origin: ${JSON.stringify(origin)},
        name: ${JSON.stringify(componentName)},
        contractEndpoint: ${JSON.stringify(contractEndpoint)},
        componentProps,
        ...options,
      };
    }

    /**
     * Direct usage with @dev-to/react-loader:
     *
     * import { ReactLoader } from '@dev-to/react-loader'
     * import { loaderConfig, createLoaderProps } from '${origin}/__dev_to_react__/loader/${componentName}.js'
     *
     * // Option 1: Use the config directly
     * <ReactLoader {...loaderConfig} componentProps={{ your: 'props' }} />
     *
     * // Option 2: Use the factory function
     * <ReactLoader {...createLoaderProps({ your: 'props' })} />
     */

    export default loaderConfig;
  `.trim()
}
