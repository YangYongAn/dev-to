# @dev-to/react-plugin

## 1.1.7

### Patch Changes

- 11a5514: chore: release all packages
- Updated dependencies [11a5514]
  - @dev-to/shared@1.0.5

## 1.1.6

### Patch Changes

- Updated dependencies [400d3e2]
  - @dev-to/shared@1.0.4

## 1.1.5

### Patch Changes

- 062dcc1: refactor: update dependency from @dev-to/react-shared to @dev-to/shared
- Updated dependencies [062dcc1]
  - @dev-to/shared@1.0.3

## 1.1.4

### Patch Changes

- Updated dependencies
  - @dev-to/shared@1.0.2

## 1.1.3

### Patch Changes

- 02b8bd6: fix: resolve Vite CLI when package exports block bin path

## 1.1.2

### Patch Changes

- chore: bump patch versions for public packages
- Updated dependencies
  - @dev-to/shared@1.0.1

## 1.1.1

### Patch Changes

- f138c7d: fix: ship dev-to bin without requiring build outputs

## 1.1.0

### Minor Changes

- f3f0717: feat: add dev-to CLI for library builds

  - Add `dev-to build` wrapper for `vite build --mode lib`
  - Forward extra Vite build flags

## 1.0.2

### Patch Changes

- 7fa2e13: fallback to CDN when local react-loader UMD not found

## 1.0.1

### Patch Changes

- Fix plugin injection and add UMD fallback

  **create-dev-to changes:**

  - Fix React Compiler branch plugin format issue by rewriting injectPluginIntoViteConfig with bracket depth matching
  - Auto-generate HelloWorld component files with useState example and responsive styles
  - Fix Gitee mirror clone failing due to non-empty target directory

  **react-plugin changes:**

  - Fallback to CDN when local react-loader UMD not found
  - Add HTTP 302 redirect to CDN for missing local UMD files
  - Auto-detect local UMD availability and use CDN in user projects

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

### Patch Changes

- 61ecb74: Simplify and optimize debug panel startup message display

  - Simplified debug panel display to show only the essential localhost URL instead of all network addresses
  - Moved debug panel message to appear after Vite's server startup info using `setImmediate`
  - Reduced visual clutter by removing duplicate IP addresses (127.0.0.1, LAN IPs) and JSON endpoint from startup log
  - Added eye-catching cyan background badge styling to "DevTo" label for better visibility
  - Improved alignment with Vite's native URL display format using the same `➜` symbol

  Before:

  ```
  [dev_to:react] Debug panel:
    http://localhost:5173/__dev_to__/debug.html
    http://127.0.0.1:5173/__dev_to__/debug.html
    http://192.168.137.122:5173/__dev_to__/debug.html
    JSON: http://localhost:5173/__dev_to__/debug.json
  ```

  After:

  ```
    VITE v5.4.21  ready in 400 ms

    ➜  Local:   http://localhost:5173/
    ➜  Network: http://192.168.137.122:5173/
    ➜  DevTo    http://localhost:5173/__dev_to__
  ```

  This change provides a cleaner, more professional developer experience that aligns with Vite's UI patterns.

- Updated dependencies [ea3b5d3]
  - @dev-to/shared@1.0.0

## 0.4.1

### Patch Changes

- 56ca922: refactor: improve API signature and type documentation

  - Refactor `devToReactPlugin` function signature for better clarity and type safety
  - Rename parameter `devComponentMap` to `components` for better semantic meaning
  - Change from arrow function const to named export function declaration
  - Return type changed from `Plugin[]` to `any` for Vite version compatibility (4.0.0+)
  - Add comprehensive JSDoc documentation with 4 practical usage examples
  - Enhance `DevToReactPluginOptions` with detailed descriptions and code examples
  - Enhance `DevComponentMapInput` type documentation with clear examples
  - Improve developer experience with better IDE hints and autocompletion
  - Fix TS2769 type compatibility issues across different Vite versions

## 0.4.0

### Minor Changes

- 1c48910: # Enhance UMD Wrapper Documentation and Debug Panel

  ## Features

  ### Debug Panel Improvements

  - **New "UMD Wrapper" Column**: Added third column to component mapping table showing auto-generated wrapper URLs
  - **Copy Button**: Each wrapper address has a 📋 copy button with visual feedback
  - **New Wrapper Documentation Section**: Added comprehensive "🎁 UMD Dynamic Wrapper" guide with:
    - What is the wrapper and how it works
    - 3 integration examples (Direct React rendering, JSX, Legacy function call)
    - Key features and capabilities
    - Auto-loading and dependency management details

  ### UMD Wrapper Code Enhancements

  - **Improved Documentation**: Updated JSDoc with clearer Quick Start guide
  - **Better Console Logging**:
    - Colored console output on first successful render
    - Detailed error logging with component name and props when rendering fails
    - Uses styled `console.info()` with CSS formatting
  - **Enhanced Error Handling**: Better error context and debugging information

  ### Documentation & Integration

  - Zero-config package wrapper that works in any React environment
  - Auto-generated for every component via `/__dev_to_react__/loader/{ComponentName}.js`
  - Supports CommonJS, AMD, and global scope modules
  - Component instantly available as `window.ComponentName`

  ## User Experience Improvements

  - Developers can now copy wrapper URLs directly from debug panel
  - Clear visual feedback when copying (✓ checkmark with green highlight)
  - Comprehensive guide on how to use the auto-generated wrapper
  - Better debugging with styled console logs and helpful error messages
  - Three different integration patterns documented for flexibility

  ## Technical Details

  - Wrapper auto-detects and validates React/ReactDOM availability
  - Supports dependency auto-loading from CDN if not already present
  - Lightweight implementation with minimal overhead
  - Proper error handling and prop validation

## 0.3.0

### Minor Changes

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

### Patch Changes

- ac63fb5: # Fix React Error #130: Use Classic JSX Transform for UMD Build

  ## @dev-to/react-loader

  ### Bug Fixes

  - **CRITICAL FIX**: Change UMD build to use classic JSX transform instead of automatic
    - Configure `runtime: 'classic'` in rslib config for UMD build
    - Add explicit `import React from 'react'` to ReactLoader.tsx
    - This fixes React Error #130 (invalid element type) in production UMD environments
  - Reduce UMD bundle size from 55.7 kB to 40.5 kB (gzip: 7.9 kB to 6.9 kB)

  ### Technical Details

  The automatic JSX transform (`jsx-runtime`) doesn't work properly in UMD/browser globals environments. Classic JSX transform (`React.createElement`) is required for standalone UMD bundles.

  **Before (broken):**

  ```js
  // Compiled with automatic runtime - React not in scope
  import { jsx } from "react/jsx-runtime";
  jsx("div", { children: "Hello" });
  ```

  **After (fixed):**

  ```js
  // Compiled with classic runtime - uses global React
  React.createElement("div", null, "Hello");
  ```

  ## @dev-to/react-plugin

  ### Features

  - Add local react-loader UMD endpoint: `/__dev_to_react__/react-loader.js`
    - Serves local UMD build for testing before publishing to npm
    - Enables development and testing without waiting for npm publish/CDN update
  - Add `reactLoaderUrl` parameter to UMD wrapper generator
    - Dev: Uses local UMD build (`http://localhost:5173/__dev_to_react__/react-loader.js`)
    - Prod: Uses CDN (`https://cdn.jsdelivr.net/npm/@dev-to/react-loader@latest/dist/index.umd.js`)

  ### Testing

  Added test pages to verify the fix:

  - `test-local-dev.html` - Tests with local react-loader UMD build
  - `test-production-like.html` - Simulates production loading scenario

  ## Impact

  This fixes the critical "Minified React error #130" that users were experiencing when loading components via the UMD loader in production environments.

- Updated dependencies [266dc9a]
  - @dev-to/shared@0.1.2

## 0.2.0

### Minor Changes

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

- d1c6837: fix(react-plugin): use absolute paths instead of file:// URLs for imports

### Patch Changes

- Updated dependencies [c9f78dd]
  - @dev-to/shared@0.1.1

## 0.1.1

### Patch Changes

- 0233a3b: fix: add colored URL output in terminal

  - Use picocolors to highlight debug panel URLs in cyan, matching Vite's output style
  - Remove dev server spinner to prevent output interference

## 0.1.0

### Minor Changes

- 59a4c44: initial release

### Patch Changes

- 94802f5: setup automated release workflow with changesets
- Updated dependencies [59a4c44]
- Updated dependencies [94802f5]
  - @dev-to/shared@0.1.0
