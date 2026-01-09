# create-dev-to

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
