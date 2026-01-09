# GitHub Copilot Instructions

## Commit Message Format

When generating commit messages, you MUST follow the Conventional Commits format with **mandatory scopes**.

### Format Template

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Rules

1. **Type** (required): Choose from:
   - `feat` - new feature
   - `fix` - bug fix
   - `perf` - performance improvement
   - `refactor` - code refactoring
   - `docs` - documentation changes
   - `test` - adding or updating tests
   - `build` - build system changes
   - `ci` - CI/CD changes
   - `chore` - other changes
   - `revert` - revert previous commit

2. **Scope** (required): MUST be one of:
   - Package scopes: `create-dev-to`, `react-loader`, `react-playground`, `react-plugin`, `react-shared`, `react-template`
   - Non-package scopes: `repo`, `deps`, `ci`

3. **Subject** (required):
   - Use lowercase
   - No period at the end
   - Brief and descriptive

4. **Breaking Changes**:
   - Add `!` after scope: `feat(react-plugin)!: ...`
   - Or add `BREAKING CHANGE:` in footer

### Scope Selection Guidelines

- **Package changes**: Use the package folder name (`react-plugin`, `react-loader`, etc.)
- **Monorepo-wide changes**: Use `repo`
- **Dependency updates**: Use `deps`
- **CI/CD configuration**: Use `ci`
- **Multi-package changes**: Prefer separate commits per package, or use `repo` scope with body listing affected packages

### Examples

```
feat(react-plugin): add css url rewriting for cross-origin hosts
fix(react-loader): use automatic jsx runtime in rslib build
docs(react-template): add remote card demos
chore(repo): update workspace tooling
chore(deps): bump vite to 5.4.11
build(react-playground): migrate to rsbuild
```

### IMPORTANT

- **NEVER** omit the scope - it is mandatory for all commits
- **ALWAYS** choose a scope from the allowed list above
- **DO NOT** create new scopes without updating this file first
