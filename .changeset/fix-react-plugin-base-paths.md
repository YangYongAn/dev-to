---
"@dev-to/react-plugin": patch
"@dev-to/react-loader": patch
"@dev-to/vue-plugin": patch
"@dev-to/vue-loader": patch
"@dev-to/shared": patch
---

feat(react-plugin): ensure /__dev_to__/ paths work with any base config

- Enhanced resolveId hook to normalize paths and remove potential base prefix
- Added path validation for absolute URLs (http/https)
- Ensured virtual module paths (contract.js, init.js, runtime.js) are resolved correctly
- Added middleware comment explaining direct URL interception
- Plugin internal paths now stable regardless of user's base configuration

This allows users to freely configure base for CDN deployment without
affecting the /__dev_to__/ bridge paths. Both development and production
environments maintain consistent behavior.

docs(react-plugin): add CDN deployment configuration guide

Added comprehensive documentation for deploying build artifacts to CDN:
- Approach 1: experimental.renderBuiltUrl (Recommended)
- Approach 2: build.rollupOptions
- Approach 3: Conditional base setting

All /__dev_to__/ paths are NOT affected by base configuration.
