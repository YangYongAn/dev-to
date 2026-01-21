---
"@dev-to/shared": minor
"@dev-to/react-plugin": minor
"@dev-to/vue-plugin": minor
---

Unify loader path to framework-agnostic format

BREAKING CHANGE: Loader endpoints changed from framework-specific to unified paths:
- `/__dev_to__/react/loader.js` -> `/__dev_to__/loader.js`
- `/__dev_to__/vue/loader.js` -> `/__dev_to__/loader.js`
- `/__dev_to__/react/loader/{name}.js` -> `/__dev_to__/loader/{name}.js`
- `/__dev_to__/vue/loader/{name}.js` -> `/__dev_to__/loader/{name}.js`

Since a Vite project uses only one framework, the framework name in loader path is redundant.
