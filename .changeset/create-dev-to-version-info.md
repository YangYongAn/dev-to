---
"create-dev-to": patch
---

Add version and build information display on startup

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
