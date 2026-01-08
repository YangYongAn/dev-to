---
"@dev-to/react-plugin": minor
"@dev-to/react-loader": minor
"@dev-to/react-shared": patch
"@dev-to/react-template": patch
---

# UMD Loader Endpoint and Smart Dependency Loading

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
