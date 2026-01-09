---
'@dev-to/react-plugin': patch
---

refactor: improve API signature and type documentation

- Refactor `devToReactPlugin` function signature for better clarity and type safety
- Rename parameter `devComponentMap` to `components` for better semantic meaning
- Change from arrow function const to named export function declaration
- Return type changed from `Plugin[]` to `any` for Vite version compatibility (4.0.0+)
- Add comprehensive JSDoc documentation with 4 practical usage examples
- Enhance `DevToReactPluginOptions` with detailed descriptions and code examples
- Enhance `DevComponentMapInput` type documentation with clear examples
- Improve developer experience with better IDE hints and autocompletion
- Fix TS2769 type compatibility issues across different Vite versions
