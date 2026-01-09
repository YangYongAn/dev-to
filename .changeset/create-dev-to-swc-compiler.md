---
"create-dev-to": minor
---

Add SWC and React Compiler configuration options to scaffolding

Implement optional configuration for SWC (Speedy Web Compiler) and React Compiler
after template variant selection. These are now handled as post-processing steps
rather than separate templates, matching the Vite official approach.

Features:
- Add setupReactSWC() to replace @vitejs/plugin-react with @vitejs/plugin-react-swc
- Add setupReactCompiler() to configure babel-plugin-react-compiler with proper babel setup
- Add editFile() helper for safely modifying package.json and vite.config files
- Prompt users after template selection for SWC and React Compiler options
- Display progress messages during configuration steps
- Simplify React templates to match actual Vite repository structure (react-ts and react only)

The implementation now correctly aligns with the Vite official create-vite behavior
where SWC and Compiler variants are post-processing modifications, not separate templates.
