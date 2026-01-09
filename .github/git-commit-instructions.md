# Git Commit Instructions

This monorepo uses **Conventional Commits** with **mandatory scopes** for all commits.

## Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

## Rules

1. **Type** (required): `feat` | `fix` | `perf` | `refactor` | `docs` | `test` | `build` | `ci` | `chore` | `revert`
2. **Scope** (required): Must be one of the allowed scopes below
3. **Subject** (required): Brief description in lowercase, no period at end
4. **Breaking changes**: Use `!` after scope or add `BREAKING CHANGE:` in footer

## Allowed Scopes

**Package scopes** (use the package folder name):
- `create-dev-to`
- `react-loader`
- `react-playground`
- `react-plugin`
- `react-shared`
- `react-template`

**Non-package scopes**:
- `repo` - monorepo-wide changes
- `deps` - dependency updates
- `ci` - CI/CD configuration changes

## Examples

```
feat(react-plugin): add css url rewriting for cross-origin hosts
fix(react-loader): use automatic jsx runtime in rslib build
docs(react-template): add remote card demos
chore(repo): update workspace tooling
chore(deps): bump vite to 5.4.11
```

## Multi-package Changes

If a change affects multiple packages, prefer **splitting into separate commits** (one per package). If not possible, use `repo` scope and list affected packages in the commit body.

