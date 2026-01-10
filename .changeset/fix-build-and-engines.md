---
"create-dev-to": patch
---

Fix module not found error and add Node.js version requirement

**Bug Fixes:**
- Fixed "Cannot find module" error when running `pnpm create dev-to`
- Changed esbuild configuration to compile all source files (index, installLogger, visualComponents, outputParsers) instead of just the entry point
- All required modules are now properly included in the dist directory

**Improvements:**
- Added `engines` field requiring Node.js >=18.0.0
- Ensures compatibility with ES Modules, node: prefix imports, and @clack/prompts dependency
- Users will be warned if their Node.js version is too old
