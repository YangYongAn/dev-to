# @dev-to/vue-plugin

## 0.4.0

### Minor Changes

- e1b2fa9: Unify loader path to framework-agnostic format

  BREAKING CHANGE: Loader endpoints changed from framework-specific to unified paths:

  - `/__dev_to__/react/loader.js` -> `/__dev_to__/loader.js`
  - `/__dev_to__/vue/loader.js` -> `/__dev_to__/loader.js`
  - `/__dev_to__/react/loader/{name}.js` -> `/__dev_to__/loader/{name}.js`
  - `/__dev_to__/vue/loader/{name}.js` -> `/__dev_to__/loader/{name}.js`

  Since a Vite project uses only one framework, the framework name in loader path is redundant.

### Patch Changes

- Updated dependencies [e1b2fa9]
  - @dev-to/shared@1.1.0

## 0.3.0

### Minor Changes

- 0e53d63: Add debug page and UMD wrapper support

  - Add full debug page with Vue-themed styling, component configuration display, and environment setup commands
  - Add auto-generated UMD wrapper for components (`/__dev_to__/vue/loader/{ComponentName}.js`)
  - Add lib build utilities with Vue SFC (.vue) file support
  - Export new functions: `createLoaderUmdWrapper`, `renderDebugHtml`, and lib build utilities

## 0.2.3

### Patch Changes

- 11a5514: chore: release all packages
- Updated dependencies [11a5514]
  - @dev-to/shared@1.0.5

## 0.2.2

### Patch Changes

- Updated dependencies [400d3e2]
  - @dev-to/shared@1.0.4

## 0.2.1

### Patch Changes

- 062dcc1: feat: initial release of Vue Vite plugin

  Vite plugin for Vue component providers with HMR support.

- Updated dependencies [062dcc1]
  - @dev-to/shared@1.0.3

## 0.2.0

### Minor Changes

- feat: add Vue 3 support

  - @dev-to/vue-plugin: Vite plugin for Vue component providers
  - @dev-to/vue-loader: Host-side loader for mounting remote Vue components
  - @dev-to/shared: Add Vue-specific constants and types

### Patch Changes

- Updated dependencies
  - @dev-to/shared@1.0.2

## 0.1.0

- Initial release with discovery/contract/init/runtime for Vue dev HMR.
