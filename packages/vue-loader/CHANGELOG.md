# @dev-to/vue-loader

## 0.2.5

### Patch Changes

- 0c92c63: feat(react-plugin): ensure /**dev_to**/ paths work with any base config

  - Enhanced resolveId hook to normalize paths and remove potential base prefix
  - Added path validation for absolute URLs (http/https)
  - Ensured virtual module paths (contract.js, init.js, runtime.js) are resolved correctly
  - Added middleware comment explaining direct URL interception
  - Plugin internal paths now stable regardless of user's base configuration

  This allows users to freely configure base for CDN deployment without
  affecting the /**dev_to**/ bridge paths. Both development and production
  environments maintain consistent behavior.

  docs(react-plugin): add CDN deployment configuration guide

  Added comprehensive documentation for deploying build artifacts to CDN:

  - Approach 1: experimental.renderBuiltUrl (Recommended)
  - Approach 2: build.rollupOptions
  - Approach 3: Conditional base setting

  All /**dev_to**/ paths are NOT affected by base configuration.

- Updated dependencies [0c92c63]
  - @dev-to/shared@1.1.1

## 0.2.4

### Patch Changes

- Updated dependencies [e1b2fa9]
  - @dev-to/shared@1.1.0

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

- 062dcc1: feat: initial release of Vue loader component

  Host-side loader for mounting remote Vue components.

- Updated dependencies [062dcc1]
  - @dev-to/shared@1.0.3

## 0.2.0

### Minor Changes

- feat: add Vue 3 support

  - @dev-to/vue-plugin: Vite plugin for Vue component providers
  - @dev-to/vue-loader: Host-side loader for mounting remote Vue components
  - @dev-to/shared: Add Vue-specific constants and types

### Patch Changes

- 789b752: fix: add minimal DOM shims for window usage
- Updated dependencies
  - @dev-to/shared@1.0.2

## 0.1.0

- Initial release with VueLoader component for dev server components.
