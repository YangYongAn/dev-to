---
"@dev-to/vue-plugin": minor
---

Add debug page and UMD wrapper support

- Add full debug page with Vue-themed styling, component configuration display, and environment setup commands
- Add auto-generated UMD wrapper for components (`/__dev_to__/vue/loader/{ComponentName}.js`)
- Add lib build utilities with Vue SFC (.vue) file support
- Export new functions: `createLoaderUmdWrapper`, `renderDebugHtml`, and lib build utilities
