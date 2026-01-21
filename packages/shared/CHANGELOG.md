# @dev-to/shared

## 1.0.2

### Patch Changes

- feat: add Vue 3 support

  - @dev-to/vue-plugin: Vite plugin for Vue component providers
  - @dev-to/vue-loader: Host-side loader for mounting remote Vue components
  - @dev-to/shared: Add Vue-specific constants and types

## 1.0.1

### Patch Changes

- chore: bump patch versions for public packages

## 1.0.0

### Major Changes

- ea3b5d3: ## Unified `__dev_to__` Discovery Endpoint - Major Refactoring

  ### Breaking Changes

  1. **New URL Structure**: All endpoints now use unified `/__dev_to__/*` namespace instead of `/__dev_to_react__/*`

     - Base path: `/__dev_to_react__` → `/__dev_to__`
     - Framework-specific paths: `/__dev_to__/react/*`
     - Examples:
       - `/__dev_to_react__/contract.js` → `/__dev_to__/react/contract.js`
       - `/__dev_to_react__/init.js` → `/__dev_to__/react/init.js`
       - `/__dev_to_react__/react-runtime.js` → `/__dev_to__/react/runtime.js`
       - `/__dev_to_react__/loader.js` → `/__dev_to__/react/loader.js`
       - `/__dev_to_react__/debug.html` → `/__dev_to__/debug.html`
       - `/__dev_to_react__/loader/*.js` → `/__dev_to__/react/loader/*.js`

  2. **Event Names**: HMR events now use framework-scoped naming

     - `dev_to_react:full-reload` → `dev_to:react:full-reload`
     - `dev_to_react:hmr-update` → `dev_to:react:hmr-update`

  3. **Deprecated Exports Removed** (@dev-to/react-plugin):

     - Removed `viteHostReactBridgePlugin` alias (use `devToReactPlugin`)
     - Removed `ViteHostReactBridgePluginOptions` type (use `DevToReactPluginOptions`)

  4. **New Constants** (@dev-to/shared):
     - `DEV_TO_NAMESPACE` = `'dev_to'` (unified)
     - `DEV_TO_BASE_PATH` = `'/__dev_to__'` (unified)
     - `DEV_TO_DISCOVERY_PATH` = `'/__dev_to__/discovery.json'` (new)
     - `DEV_TO_DEBUG_HTML_PATH` = `'/__dev_to__/debug.html'` (moved to root)
     - `DEV_TO_DEBUG_JSON_PATH` = `'/__dev_to__/debug.json'` (moved to root)
     - `DEV_TO_REACT_NAMESPACE` = `'react'` (was `'dev_to_react'`)
     - `DEV_TO_REACT_BASE_PATH` = `'/__dev_to__/react'` (was `'/__dev_to_react__'`)
     - `DEV_TO_REACT_RUNTIME_PATH` = `'/__dev_to__/react/runtime.js'` (was `'/__dev_to_react__/react-runtime.js'`)
     - `DEV_TO_REACT_LOADER_UMD_PATH` = `'/__dev_to__/react/loader.js'` (new)

  ### New Features

  1. **Unified Discovery Endpoint** (`/__dev_to__/discovery.json`)

     - Framework-agnostic discovery contract with framework type, version, server info
     - Returns all available endpoints, component map, HMR events, and protocol metadata
     - Enables future support for Vue, Svelte, and other frameworks
     - Use: `loadDiscoveryContract(origin, discoveryEndpoint?)` in @dev-to/react-loader

  2. **Framework-Agnostic Architecture**

     - New `DevToDiscoveryContract` interface for unified discovery
     - New `loadDiscoveryContract()` export in @dev-to/react-loader
     - Loader can auto-detect framework type from discovery endpoint

  3. **Better Path Organization**
     - Unified `/__ dev_to__` namespace for all dev-to features
     - Framework-specific paths nested under `/__dev_to__/{framework}/`
     - Clear separation between framework-agnostic (root level) and framework-specific (nested) endpoints

  ### Migration Guide

  #### For Plugin Users (Vite Config)

  No changes required - the plugin automatically serves both old and new paths internally.

  **Before:**

  ```typescript
  import { devToReactPlugin } from "@dev-to/react-plugin";

  export default {
    plugins: [devToReactPlugin()],
  };
  ```

  **After:** (same, no changes needed)

  ```typescript
  import { devToReactPlugin } from "@dev-to/react-plugin";

  export default {
    plugins: [devToReactPlugin()],
  };
  ```

  #### For Loader Users (Host App)

  **Before:**

  ```typescript
  import { ReactLoader, loadBridgeContract } from '@dev-to/react-loader'

  // Manual path specification
  const contract = await loadBridgeContract(origin, '/__dev_to_react__/contract.js')
  <ReactLoader url="http://localhost:5173/__dev_to_react__/..." />
  ```

  **After:** (recommended - uses new discovery endpoint)

  ```typescript
  import { ReactLoader, loadDiscoveryContract } from '@dev-to/react-loader'

  // Auto-discovery
  const discovery = await loadDiscoveryContract(origin)
  <ReactLoader origin="http://localhost:5173" name="MyComponent" />
  ```

  #### For Advanced Users (Custom Endpoints)

  **Before:**

  ```typescript
  const contract = await loadBridgeContract(
    origin,
    "/__dev_to_react__/contract.js"
  );
  ```

  **After:**

  ```typescript
  const discovery = await loadDiscoveryContract(
    origin,
    "/__dev_to__/discovery.json"
  );
  // or use auto-detection (recommended)
  const discovery = await loadDiscoveryContract(origin);
  ```

  ### Constants Exported from @dev-to/react-plugin

  Updated constants for use in host applications:

  - `STABLE_DISCOVERY_PATH` (new)
  - `STABLE_DEBUG_HTML_PATH` (updated to root)
  - `STABLE_DEBUG_JSON_PATH` (updated to root)
  - `STABLE_LOADER_UMD_PATH` (new)
  - All other STABLE\_\* constants point to new paths

  ### Type Changes

  **New Types:**

  - `DevToDiscoveryContract` - Unified discovery contract (framework-agnostic)
    - Replaces manual contract construction with rich metadata

  **Removed Types:**

  - `ViteHostReactBridgePluginOptions` - Use `DevToReactPluginOptions`

  ### Backward Compatibility Notes

  - **No backward compatibility maintained** - This is a clean break refactoring since the project has no external users yet
  - Internal constants fully reorganized under new naming scheme
  - All example projects updated to use new paths
  - Documentation fully updated

  ### What Stays the Same

  - React Refresh mechanism unchanged
  - HMR detection logic unchanged
  - Component loading pipeline unchanged
  - CSS Module configuration unchanged
  - Build configuration options unchanged
  - `DevToReactBridgeContract` interface still supported (legacy compatibility)

  ### Future Roadmap

  This refactoring enables:

  1. **Multi-framework support** - Vue, Svelte, Solid can share the same unified discovery protocol
  2. **Framework auto-detection** - Loaders can dispatch to framework-specific implementations
  3. **Protocol versioning** - `apiLevel` field allows breaking changes in future versions
  4. **Better error diagnostics** - Rich metadata in discovery endpoint enables better error messages

  ### Packages Affected

  #### @dev-to/shared (v0.1.2 → v1.0.0 - Major)

  - **First stable release** - Graduated from 0.x to 1.0
  - Added unified discovery constants and types
  - Updated all React paths to nested structure
  - Breaking: Changed namespace from `dev_to_react` to `dev_to` + `react`

  #### @dev-to/react-plugin (v0.4.1 → v1.0.0 - Major)

  - **First stable release** - Graduated from 0.x to 1.0
  - Implemented discovery endpoint middleware
  - Updated all endpoint paths
  - Removed deprecated exports
  - Breaking: Changed all bridge URLs

  #### @dev-to/react-loader (v0.3.0 → v1.0.0 - Major)

  - **First stable release** - Graduated from 0.x to 1.0
  - Added `loadDiscoveryContract()` API
  - Updated default endpoints
  - Breaking: Changed default contract endpoint

  #### create-dev-to (v1.0.0 → v1.0.1 - Patch)

  - No code changes - automatically uses latest plugin versions
  - Patch bump for dependency alignment

## 0.1.2

### Patch Changes

- 266dc9a: # UMD Loader with Auto-Loading and Smart Dependency Detection

  ## @dev-to/react-plugin

  ### Major Features

  - **New UMD loader endpoint** `/__dev_to_react__/loader/{ComponentName}.js`
    - Generates lightweight 2KB UMD wrapper (delegates to @dev-to/react-loader)
    - **Auto-loads @dev-to/react-loader from CDN** if not present (zero config required)
    - Returns Promise from render() for async loading support

  ### Improvements

  - Fixed Rollup build issue: use absolute paths instead of file:// URLs for imports
  - Improved JSX compatibility and component extraction in loader
  - Use contract-based path resolution for components
  - Better error messages and debugging support

  ### Breaking Changes

  - `render()` method now returns `Promise<ReactRoot>` instead of `ReactRoot`
    - Old: `component.render(element, props)`
    - New: `component.render(element, props).then(root => ...)`

  ## @dev-to/react-loader

  - Add UMD build configuration with rslib
  - Export UMD bundle at `./dist/index.umd.js` (55.7 kB, 7.9 kB gzipped)
  - Configure external React/ReactDOM dependencies for browser usage
  - Support CDN distribution via jsdelivr (`https://cdn.jsdelivr.net/npm/@dev-to/react-loader`)

  ## @dev-to/shared

  - Add `DEV_TO_REACT_LOADER_BASE_PATH` constant for loader endpoints

  ## @dev-to/react-template

  - Add smart dependency detection in loader examples
  - Automatically check if React/ReactDOM already loaded before loading from CDN
  - Improve examples with promise-based sequential loading and better error handling
  - Add test pages for auto-loading and manual loading scenarios

  ### Usage Example

  ```html
  <!-- Only need React and the component wrapper -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="http://localhost:5173/__dev_to_react__/loader/MyComponent.js"></script>

  <div id="app"></div>
  <script>
    // ReactLoader is auto-loaded from CDN
    window.MyComponent.render(document.getElementById("app"), {
      title: "Hello World",
    }).then(() => {
      console.log("Rendered!");
    });
  </script>
  ```

## 0.1.1

### Patch Changes

- c9f78dd: # UMD Loader Endpoint and Smart Dependency Loading

  ## @dev-to/react-plugin

  - Add new UMD loader endpoint `/__dev_to_react__/loader/{ComponentName}.js`
  - Generate lightweight UMD wrapper that delegates to @dev-to/react-loader
  - Improve JSX compatibility and component extraction in loader
  - Use contract-based path resolution for components

  ## @dev-to/react-loader

  - Add UMD build configuration with rslib
  - Export UMD bundle at `./dist/index.umd.js` (55.7 kB)
  - Configure external React/ReactDOM dependencies for browser usage
  - Support CDN distribution via jsdelivr

  ## @dev-to/shared

  - Add `DEV_TO_REACT_LOADER_BASE_PATH` constant for loader endpoints

  ## @dev-to/react-template

  - Add smart dependency detection in loader example
  - Automatically check if React/ReactDOM already loaded before loading from CDN
  - Improve example with promise-based sequential loading and better error handling

## 0.1.0

### Minor Changes

- 59a4c44: initial release

### Patch Changes

- 94802f5: setup automated release workflow with changesets
