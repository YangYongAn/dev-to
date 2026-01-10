---
"create-dev-to": minor
---

Redesign CLI banner with ASCII art logo and enhanced build information

Complete redesign of the create-dev-to startup banner featuring a colorful ASCII art logo and comprehensive build information display.

**Visual Improvements:**
- Large 6-line ASCII art "dev-to" logo with DEV in cyan and TO in yellow
- Version number highlighted in green for better visibility
- Build metadata (git commit/branch, local timestamp) displayed alongside logo

**Technical Improvements:**
- Migrated from TypeScript compiler to esbuild for faster builds
- Build-time git info injection via esbuild `define` option
- Consolidated build and dev scripts with `--watch` flag support
- UTC timestamp stored at build time, converted to local timezone at runtime
- Preserved source shebang for flexibility with future Node.js runtime options (tsx, --experimental-strip-types)

**Example Output:**
```
  ██████╗ ███████╗██╗   ██╗    ████████╗ ██████╗   v1.1.0
  ██╔══██╗██╔════╝██║   ██║    ╚══██╔══╝██╔═══██╗  abc1234 on main
  ██║  ██║█████╗  ██║   ██║       ██║   ██║   ██║  2026-01-10 14:30
  ██║  ██║██╔══╝  ╚██╗ ██╔╝       ██║   ██║   ██║
  ██████╔╝███████╗ ╚████╔╝        ██║   ╚██████╔╝
  ╚═════╝ ╚══════╝  ╚═══╝         ╚═╝    ╚═════╝
```
