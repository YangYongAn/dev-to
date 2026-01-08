# @dev-to/react-plugin

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

  ## @dev-to/react-shared

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
  - @dev-to/react-shared@0.1.2

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

  ## @dev-to/react-shared

  - Add `DEV_TO_REACT_LOADER_BASE_PATH` constant for loader endpoints

  ## @dev-to/react-template

  - Add smart dependency detection in loader example
  - Automatically check if React/ReactDOM already loaded before loading from CDN
  - Improve example with promise-based sequential loading and better error handling

- d1c6837: fix(react-plugin): use absolute paths instead of file:// URLs for imports

### Patch Changes

- Updated dependencies [c9f78dd]
  - @dev-to/react-shared@0.1.1

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
  - @dev-to/react-shared@0.1.0
