---
"@dev-to/react-plugin": minor
"@dev-to/react-loader": minor
"@dev-to/react-shared": patch
"@dev-to/react-template": patch
---

# UMD Loader with Auto-Loading and Smart Dependency Detection

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
  window.MyComponent.render(document.getElementById('app'), {
    title: 'Hello World'
  }).then(() => {
    console.log('Rendered!');
  });
</script>
```
