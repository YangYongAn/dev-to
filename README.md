# dev-to

A monorepo for React component development and deployment tools.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@dev-to/create-react](./packages/create-react) | [![npm](https://img.shields.io/npm/v/@dev-to/create-react.svg)](https://www.npmjs.com/package/@dev-to/create-react) | CLI tool for creating React projects with dev-to-react setup |
| [@dev-to/react-plugin](./packages/react-plugin) | [![npm](https://img.shields.io/npm/v/@dev-to/react-plugin.svg)](https://www.npmjs.com/package/@dev-to/react-plugin) | Vite plugin for React component development |
| [@dev-to/react-loader](./packages/react-loader) | [![npm](https://img.shields.io/npm/v/@dev-to/react-loader.svg)](https://www.npmjs.com/package/@dev-to/react-loader) | React component loader |
| [@dev-to/react-shared](./packages/react-shared) | [![npm](https://img.shields.io/npm/v/@dev-to/react-shared.svg)](https://www.npmjs.com/package/@dev-to/react-shared) | Shared utilities and types |

## Quick Start

```bash
# Create a new React project
npx @dev-to/create-react my-app
```

## Development

This project uses:
- **pnpm** - Package manager
- **Changesets** - Version management and changelogs
- **ESLint** - Code linting
- **TypeScript** - Type checking

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run linting
pnpm lint
```

## Release

```bash
# Create a changeset
pnpm changeset

# Version packages
pnpm changeset version

# Publish to npm
pnpm changeset publish
```

## License

MIT
