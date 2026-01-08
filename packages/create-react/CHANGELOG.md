# @dev-to/create-react

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
