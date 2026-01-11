---
'create-dev-to': minor
---

Simplify framework selection flow following create-vite approach

- **Two-step Selection**: Streamlined from 4-5 steps to just 2 steps (Framework → Variant)
- **Variant System**: SWC, React Compiler, and other options are now variants under each framework
  - TypeScript
  - TypeScript + React Compiler
  - TypeScript + SWC
  - JavaScript
  - JavaScript + React Compiler
  - JavaScript + SWC
- **Removed Redundant Steps**: No more separate confirmation prompts for SWC, React Compiler, or Rolldown
- **Smart Detection**: Automatically detect features from template names (e.g., `react-swc-ts`, `react-compiler-ts`)
- **ESC Handling Fix**: Pressing ESC during install confirmation now properly cancels the operation
- **Better Scalability**: Adding new frameworks won't require adding new confirmation steps for framework-specific features
