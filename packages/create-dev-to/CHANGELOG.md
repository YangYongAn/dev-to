# create-dev-to

## 1.5.1

### Patch Changes

- 4b9221c: Unify CLI theme colors with website branding for consistent visual identity

## 1.5.0

### Minor Changes

- a33401b: Simplify framework selection flow following create-vite approach

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

## 1.4.0

### Minor Changes

- 5579e8f: Add template caching with commit hash validation and improve user experience

  - **Template Caching**: Cache downloaded templates in `~/.create-dev-to-cache` for faster subsequent project creation
  - **Smart Cache Validation**: Check specific template directory commit hash instead of entire repo HEAD for accurate cache invalidation
  - **Cache Status Visualization**: Display cache status and commit hash in scaffolding messages:
    - "Project created with cached template (abc12345)" when using cache
    - "Project created (abc12345)" when downloading fresh
  - **Plugin Configuration**: Use string shorthand `devToReactPlugin('ComponentName')` for default component names, object form for custom names

## 1.3.3

### Patch Changes

- 7fa2e13: fix plugin injection and add component generation

## 1.3.2

### Patch Changes

- Fix plugin injection and add UMD fallback

  **create-dev-to changes:**

  - Fix React Compiler branch plugin format issue by rewriting injectPluginIntoViteConfig with bracket depth matching
  - Auto-generate HelloWorld component files with useState example and responsive styles
  - Fix Gitee mirror clone failing due to non-empty target directory

  **react-plugin changes:**

  - Fallback to CDN when local react-loader UMD not found
  - Add HTTP 302 redirect to CDN for missing local UMD files
  - Auto-detect local UMD availability and use CDN in user projects

## 1.3.1

### Patch Changes

- 36cc38e: Fix module not found error and add Node.js version requirement

  **Bug Fixes:**

  - Fixed "Cannot find module" error when running `pnpm create dev-to`
  - Changed esbuild configuration to compile all source files (index, installLogger, visualComponents, outputParsers) instead of just the entry point
  - All required modules are now properly included in the dist directory

  **Improvements:**

  - Added `engines` field requiring Node.js >=18.0.0
  - Ensures compatibility with ES Modules, node: prefix imports, and @clack/prompts dependency
  - Users will be warned if their Node.js version is too old

## 1.3.0

### Minor Changes

- 4739440: Redesign CLI banner with ASCII art logo and enhanced build information

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

### Patch Changes

- 0f223e1: Add version and build information display on startup

  Display package version, git commit hash, branch name, and build date when
  create-dev-to runs. This helps users verify they have the correct version
  and understand the build information.

  Example output:
  create-dev-to v1.1.0 (abc1234 on main) - 2026-01-09

  Features:

  - Reads version from package.json
  - Retrieves git commit hash and branch via git commands
  - Gracefully handles errors if git is unavailable
  - Displays info in dim/gray text after intro

## 1.2.0

### Minor Changes

- 8cf65e3: Add SWC and React Compiler configuration options to scaffolding

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

## 1.1.0

### Minor Changes

- 7d089e9: Enhance scaffolding prompts with descriptive hints and improved UX

  Add helpful hints and improved visual presentation to both project name and component name prompts:

  - Add descriptive subtitles with dim/gray styling for better guidance
  - Explain that project name is the directory where the project will be created
  - Explain that component name can be left blank to default to project name
  - Component name can be modified later in vite.config.ts
  - Use full-width spaces for proper indentation of subtitle text
  - Auto-configure devToReactPlugin in vite.config with the selected component name

  This provides users with clear guidance during the scaffolding process and ensures the generated template is pre-configured with the correct component name.

## 1.0.1

### Patch Changes

- ea3b5d3: ## Unified `__dev_to__` Discovery Endpoint - Major Refactoring

  ### Breaking Changes

  1. **New URL Structure**: All endpoints now use unified `/__dev_to__/*` namespace instead of `/__dev_to_react__/*`

     - Base path: `/__dev_to_react__` → `/__dev_to__`
     - Framework-specific paths: `/__dev_to__/react/*`
     - Examples:
       - `/__dev_to_react__/contract.js` → `/__dev_to__/react/contract.js`
       - `/__dev_to_react__/init.js` → `/__dev_to__/react/init.js`
       - `/__dev_to_react__/react-runtime.js` → `/__dev_to__/react/runtime.js`
       - `/__dev_to_react__/loader.js` → `/__dev_to__/react/loader.js`
       - `/__dev_to_react__/debug.html` → `/__dev_to__/debug.html`
       - `/__dev_to_react__/loader/*.js` → `/__dev_to__/react/loader/*.js`

  2. **Event Names**: HMR events now use framework-scoped naming

     - `dev_to_react:full-reload` → `dev_to:react:full-reload`
     - `dev_to_react:hmr-update` → `dev_to:react:hmr-update`

  3. **Deprecated Exports Removed** (@dev-to/react-plugin):

     - Removed `viteHostReactBridgePlugin` alias (use `devToReactPlugin`)
     - Removed `ViteHostReactBridgePluginOptions` type (use `DevToReactPluginOptions`)

  4. **New Constants** (@dev-to/react-shared):
     - `DEV_TO_NAMESPACE` = `'dev_to'` (unified)
     - `DEV_TO_BASE_PATH` = `'/__dev_to__'` (unified)
     - `DEV_TO_DISCOVERY_PATH` = `'/__dev_to__/discovery.json'` (new)
     - `DEV_TO_DEBUG_HTML_PATH` = `'/__dev_to__/debug.html'` (moved to root)
     - `DEV_TO_DEBUG_JSON_PATH` = `'/__dev_to__/debug.json'` (moved to root)
     - `DEV_TO_REACT_NAMESPACE` = `'react'` (was `'dev_to_react'`)
     - `DEV_TO_REACT_BASE_PATH` = `'/__dev_to__/react'` (was `'/__dev_to_react__'`)
     - `DEV_TO_REACT_RUNTIME_PATH` = `'/__dev_to__/react/runtime.js'` (was `'/__dev_to_react__/react-runtime.js'`)
     - `DEV_TO_REACT_LOADER_UMD_PATH` = `'/__dev_to__/react/loader.js'` (new)

  ### New Features

  1. **Unified Discovery Endpoint** (`/__dev_to__/discovery.json`)

     - Framework-agnostic discovery contract with framework type, version, server info
     - Returns all available endpoints, component map, HMR events, and protocol metadata
     - Enables future support for Vue, Svelte, and other frameworks
     - Use: `loadDiscoveryContract(origin, discoveryEndpoint?)` in @dev-to/react-loader

  2. **Framework-Agnostic Architecture**

     - New `DevToDiscoveryContract` interface for unified discovery
     - New `loadDiscoveryContract()` export in @dev-to/react-loader
     - Loader can auto-detect framework type from discovery endpoint

  3. **Better Path Organization**
     - Unified `/__ dev_to__` namespace for all dev-to features
     - Framework-specific paths nested under `/__dev_to__/{framework}/`
     - Clear separation between framework-agnostic (root level) and framework-specific (nested) endpoints

  ### Migration Guide

  #### For Plugin Users (Vite Config)

  No changes required - the plugin automatically serves both old and new paths internally.

  **Before:**

  ```typescript
  import { devToReactPlugin } from "@dev-to/react-plugin";

  export default {
    plugins: [devToReactPlugin()],
  };
  ```

  **After:** (same, no changes needed)

  ```typescript
  import { devToReactPlugin } from "@dev-to/react-plugin";

  export default {
    plugins: [devToReactPlugin()],
  };
  ```

  #### For Loader Users (Host App)

  **Before:**

  ```typescript
  import { ReactLoader, loadBridgeContract } from '@dev-to/react-loader'

  // Manual path specification
  const contract = await loadBridgeContract(origin, '/__dev_to_react__/contract.js')
  <ReactLoader url="http://localhost:5173/__dev_to_react__/..." />
  ```

  **After:** (recommended - uses new discovery endpoint)

  ```typescript
  import { ReactLoader, loadDiscoveryContract } from '@dev-to/react-loader'

  // Auto-discovery
  const discovery = await loadDiscoveryContract(origin)
  <ReactLoader origin="http://localhost:5173" name="MyComponent" />
  ```

  #### For Advanced Users (Custom Endpoints)

  **Before:**

  ```typescript
  const contract = await loadBridgeContract(
    origin,
    "/__dev_to_react__/contract.js"
  );
  ```

  **After:**

  ```typescript
  const discovery = await loadDiscoveryContract(
    origin,
    "/__dev_to__/discovery.json"
  );
  // or use auto-detection (recommended)
  const discovery = await loadDiscoveryContract(origin);
  ```

  ### Constants Exported from @dev-to/react-plugin

  Updated constants for use in host applications:

  - `STABLE_DISCOVERY_PATH` (new)
  - `STABLE_DEBUG_HTML_PATH` (updated to root)
  - `STABLE_DEBUG_JSON_PATH` (updated to root)
  - `STABLE_LOADER_UMD_PATH` (new)
  - All other STABLE\_\* constants point to new paths

  ### Type Changes

  **New Types:**

  - `DevToDiscoveryContract` - Unified discovery contract (framework-agnostic)
    - Replaces manual contract construction with rich metadata

  **Removed Types:**

  - `ViteHostReactBridgePluginOptions` - Use `DevToReactPluginOptions`

  ### Backward Compatibility Notes

  - **No backward compatibility maintained** - This is a clean break refactoring since the project has no external users yet
  - Internal constants fully reorganized under new naming scheme
  - All example projects updated to use new paths
  - Documentation fully updated

  ### What Stays the Same

  - React Refresh mechanism unchanged
  - HMR detection logic unchanged
  - Component loading pipeline unchanged
  - CSS Module configuration unchanged
  - Build configuration options unchanged
  - `DevToReactBridgeContract` interface still supported (legacy compatibility)

  ### Future Roadmap

  This refactoring enables:

  1. **Multi-framework support** - Vue, Svelte, Solid can share the same unified discovery protocol
  2. **Framework auto-detection** - Loaders can dispatch to framework-specific implementations
  3. **Protocol versioning** - `apiLevel` field allows breaking changes in future versions
  4. **Better error diagnostics** - Rich metadata in discovery endpoint enables better error messages

  ### Packages Affected

  #### @dev-to/react-shared (v0.1.2 → v1.0.0 - Major)

  - **First stable release** - Graduated from 0.x to 1.0
  - Added unified discovery constants and types
  - Updated all React paths to nested structure
  - Breaking: Changed namespace from `dev_to_react` to `dev_to` + `react`

  #### @dev-to/react-plugin (v0.4.1 → v1.0.0 - Major)

  - **First stable release** - Graduated from 0.x to 1.0
  - Implemented discovery endpoint middleware
  - Updated all endpoint paths
  - Removed deprecated exports
  - Breaking: Changed all bridge URLs

  #### @dev-to/react-loader (v0.3.0 → v1.0.0 - Major)

  - **First stable release** - Graduated from 0.x to 1.0
  - Added `loadDiscoveryContract()` API
  - Updated default endpoints
  - Breaking: Changed default contract endpoint

  #### create-dev-to (v1.0.0 → v1.0.1 - Patch)

  - No code changes - automatically uses latest plugin versions
  - Patch bump for dependency alignment

## 1.0.0

### Major Changes

- 1ed3b59: 重大更新：重命名包并添加多框架支持

  ## 🎯 重大变更

  - **包名更改**: `@dev-to/create-react` → `create-dev-to`
    - 新的使用方式: `pnpm create dev-to`
    - 支持 `npm create dev-to`, `yarn create dev-to`, `bun create dev-to`

  ## ✨ 新增功能

  - **多框架支持**: 添加框架选择界面

    - ✅ React (已支持)
    - 🚧 Vue, Svelte, Solid, Preact, Lit, Qwik, Vanilla (即将推出)
    - 暂不支持的框架会显示友好的 "Coming soon" 提示

  - **美观的安装进度**: 优化依赖安装体验
    - 📊 三阶段进度显示 (解析 → 下载 → 安装)
    - 🌈 渐变色进度条
    - 📈 实时统计 (包数量、耗时、下载速度)
    - 💾 磁盘占用显示

  ## 🔄 改进

  - 更新 CLI 欢迎界面为 `create-dev-to`
  - 优化项目名称默认值为 `dev-to-app`
  - 完善文档和使用示例

  ## ⚠️ 破坏性变更

  如果你之前使用 `@dev-to/create-react`，请注意：

  - 包名已更改为 `create-dev-to`
  - 使用方式从 `pnpm create @dev-to/react` 变更为 `pnpm create dev-to`
  - bin 命令从 `create-react` 变更为 `create-dev-to`

  ## 📦 迁移指南

  旧版本:

  ```bash
  pnpm create @dev-to/react
  ```

  新版本:

  ```bash
  pnpm create dev-to
  ```

### Patch Changes

- 60f9e77: 修复安装进度显示问题

  ## 🐛 Bug 修复

  - **修复 spinner 输出格式**: 在 git clone 输出前停止 spinner，防止日志连在一起
    - 现在 git clone 的输出会在新的一行开始
    - 避免 "Trying Gitee Mirror..." 和 git 输出混在同一行

  ## ✨ 改进

  - **平滑进度更新**: 添加自动进度增量功能

    - 刷新间隔优化至 50ms，提升响应速度
    - 即使没有新日志输出，每 200ms 也会自动增加进度
    - 使用递减增量算法，模拟真实安装过程

  - **改进阶段管理**: 优化 resolving/downloading/installing 三阶段转换
    - 当进入新阶段时，自动将前面的阶段标记为 100% 完成
    - 更准确的 pnpm 进度解析，基于 resolved/reused/downloaded/added 数值
    - 确保最终所有阶段都显示 100% 完成

  ## 📊 进度条体验提升

  之前：

  - 进度条更新卡顿，可能 1 秒才更新一次
  - 直接从 0% 跳到 100%
  - 最终快照显示 Resolving 87%, Downloading 99%, Installing 100%

  现在：

  - 流畅的进度更新，不会卡顿
  - 渐进式增长，不会突然跳跃
  - 最终快照显示所有阶段都是 100%

## 1.2.0

### Minor Changes

- 2614cab: # Add Network Resilience with GitHub-to-Gitee Automatic Fallback

  ## Features

  ### Multi-Source Template Cloning with Automatic Fallback

  - **Primary Source:** GitHub (vitejs/vite) using degit
  - **Fallback Source:** Gitee Mirror (mirrors/ViteJS) using native git clone
  - **Automatic Retry:** If GitHub clone fails, automatically attempts Gitee
  - **Transparent to Users:** Progress updates via spinner messages during fallback
  - **Comprehensive Error Reporting:** Shows details of all attempted sources if all fail

  ### Package Manager-Specific degit Execution

  - **pnpm** → `pnpx degit`
  - **npm** → `npx degit`
  - **yarn** → `yarn dlx degit`
  - **bun** → `bunx degit`

  Respects the user's package manager choice and uses the appropriate tool to run degit.

  ## Why Two Different Clone Strategies?

  Degit does not support Gitee (only GitHub, GitLab, Sourcehut, BitBucket).
  Therefore:

  - **GitHub:** Continues to use degit for minimal, efficient template downloads
  - **Gitee:** Uses native `git clone --depth 1` with sparse checkout for full repository support

  ## User Experience Improvements

  ### For Network-Restricted Regions

  - Users in China and other regions with limited GitHub access can seamlessly fall back to Gitee mirrors
  - No manual intervention needed - automatic fallback handles the transition

  ### For All Users

  - Better network resilience: graceful handling of unstable connections
  - Clear progress indication during template cloning
  - Informative error messages if all sources fail
  - Respects package manager preferences throughout the scaffolding process

  ## Technical Details

  ### Clone Flow

  ```
  User runs: pnpm create-dev-to

  1. Detect package manager (pnpm)
  2. Try GitHub with degit (via pnpx)
     ├─ Success: Done! Use cloned template
     └─ Failure: Continue to step 3
  3. Try Gitee with git clone
     ├─ Success: Extract template folder, use it
     └─ Failure: Show detailed errors from both sources
  ```

  ### Implementation

  #### Source Configuration

  - `TEMPLATE_SOURCES` array defines available sources with their clone strategies
  - `isGitBased` flag distinguishes between degit and git-based sources
  - Each source's `getCloneCommand()` returns the command and arguments needed

  #### GitHub (Degit) Flow

  - Uses package manager-specific command runner (pnpx/npx/yarn dlx/bunx)
  - Returns already-formatted command and args
  - Direct execution without further wrapping

  #### Gitee (Git Clone) Flow

  - Uses native `git clone --depth 1` for efficient cloning
  - Two-stage temporary directories:
    1. `tempCloneDir`: Staging area for git clone (avoids targetDir collision)
    2. `tempTargetDir`: Intermediate extraction before final move
  - Extracts `packages/create-vite/template-{template}` subfolder
  - Proper cleanup on all error paths (extraction, file operations)
  - Uses `randomUUID()` for collision-free temporary directory names

  #### Error Handling

  - Nested try-catch for git-based sources to ensure tempCloneDir cleanup
  - Final catch block cleans up tempTargetDir on any failure
  - Prevents orphaned temporary directories in edge cases
  - Comprehensive error messages showing all attempted sources

  ## Backward Compatibility

  - No breaking changes to CLI interface
  - No new dependencies (uses native git and degit)
  - Transparent fallback - users with GitHub access see no change
  - All existing workflows continue to work as expected

## 1.1.1

### Patch Changes

- 58bea35: # Fix Gitee URL Format for Degit Compatibility

  Fixed the Gitee mirror URL to use complete HTTPS format instead of short owner/repo format.

  Degit defaults to GitHub when given short repository paths (e.g., `owner/repo`).
  To properly route to Gitee, the complete URL including the host is required:
  `https://gitee.com/mirrors/ViteJS/packages/create-vite/template-{template}`

  This fix ensures that when GitHub is unavailable, the fallback to Gitee mirrors
  works correctly and users can successfully scaffold projects in network-restricted regions.

## 1.1.0

### Minor Changes

- e6050dc: # Add Network Resilience and Package Manager Awareness to Template Cloning

  ## Features

  ### GitHub-to-Gitee Automatic Fallback

  - **Multi-Source Support**: Attempts to clone Vite templates from GitHub first, then automatically falls back to Gitee mirrors if the initial attempt fails
  - **Transparent Fallback**: Users see progress updates when switching sources via spinner messages
  - **Improved Error Reporting**: Comprehensive error messages showing all attempted sources and their specific failures
  - **Network Resilience**: Handles unstable network conditions gracefully without forcing users to retry manually

  ### Package Manager-Specific degit Commands

  - **Respects User's Choice**: Uses the detected package manager to execute degit with the appropriate command runner:
    - **pnpm** → `pnpx degit`
    - **npm** → `npx degit`
    - **yarn** → `yarn dlx degit`
    - **bun** → `bunx degit`
  - **Consistency**: Avoids forcing npm/npx when users have selected a different package manager
  - **Automatic Detection**: Leverages existing `npm_config_user_agent` detection to determine the right tool

  ## User Experience Improvements

  ### For Users in Network-Restricted Regions

  - Chinese users and others with limited GitHub access can now seamlessly fall back to Gitee mirrors
  - No manual intervention needed - the tool handles switching automatically

  ### For All Users

  - Clearer progress indication during template cloning
  - More informative error messages if all sources fail
  - Package manager choice is now respected throughout the scaffolding process
  - Better support for monorepo and cross-platform development environments

  ## Technical Details

  ### Fallback Strategy

  ```
  Try GitHub (vitejs/vite)
    ↓ if fails
  Try Gitee Mirror (mirrors/ViteJS)
    ↓ if fails
  Show detailed error with all attempts
  ```

  ### Command Mapping

  Each package manager is mapped to its native package execution tool:

  - pnpm uses fast, efficient `pnpx` instead of npm's `npx`
  - yarn uses `yarn dlx` for a native yarn experience
  - bun uses `bunx` for optimal bun ecosystem integration
  - npm continues to use `npx`

  ## Backward Compatibility

  - No breaking changes to public API
  - No new dependencies required
  - Silent fallback for users with working GitHub access
  - All existing workflows continue to work as expected

## 1.0.1

### Patch Changes

- 0233a3b: fix: add colored URL output in terminal

  - Use picocolors to highlight debug panel URLs in cyan, matching Vite's output style
  - Remove dev server spinner to prevent output interference

## 1.0.0

### Major Changes

- 438492f: Add project initialization feature with template selection and plugin injection

## 0.1.0

### Minor Changes

- 59a4c44: initial release

### Patch Changes

- 94802f5: setup automated release workflow with changesets
