---
"@dev-to/react-loader": patch
"@dev-to/react-plugin": patch
---

# Fix React Error #130: Use Classic JSX Transform for UMD Build

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
import { jsx } from 'react/jsx-runtime';
jsx('div', { children: 'Hello' })
```

**After (fixed):**
```js
// Compiled with classic runtime - uses global React
React.createElement('div', null, 'Hello')
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
