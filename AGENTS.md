# Commit Message (Conventional Commits + Scope)

This repo uses **Conventional Commits** and **requires a scope** to support per-package changelogs (e.g. with `release-it`).

## Format

```
<type>(<scope>)!: <subject>

[optional body]

[optional footer]
```

- `type`: `feat` | `fix` | `perf` | `refactor` | `docs` | `test` | `build` | `ci` | `chore` | `revert`
- `scope`: **required**. Use the **package folder name** under `packages/` (see “Scopes” below).
- `!` / `BREAKING CHANGE:`: marks a breaking change (used for major bumps).

## Scopes

Use the package directory name:

- `create-react`
- `react-loader`
- `react-playground`
- `react-plugin`
- `react-shared`
- `react-template`

Non-package scopes:

- `repo` (monorepo-wide changes)
- `deps` (dependency bumps)
- `ci` (CI-only changes)

If a change affects multiple packages, prefer **splitting into multiple commits** (one per package) so each package changelog is correct. If you can’t, use `repo` and list affected packages in the body.

## Examples

- `feat(react-plugin): rewrite dev css asset urls for cross-origin hosts`
- `fix(react-loader): use automatic jsx runtime in rslib build`
- `docs(react-template): add remote card demos`
- `chore(repo): update workspace tooling`

## Release-it note

When generating per-package changelogs, commits are attributed by `scope`. A wrong/missing scope will end up in the wrong changelog (or be dropped), so keep scope accurate.

