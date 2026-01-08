---
"@dev-to/create-react": minor
---

# Add Network Resilience with GitHub-to-Gitee Automatic Fallback

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
User runs: pnpm create-react

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
