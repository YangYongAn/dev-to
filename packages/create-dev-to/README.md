# create-dev-to

快速创建集成 `@dev-to/react-plugin` 的前端项目脚手架。
Release test marker: create-dev-to ci.

## 特性

- 🎯 **多框架支持** - 支持 React/Vue（其他框架即将推出）
- ✨ **美观的安装体验** - 分阶段进度显示、渐变色、实时统计
- 🚀 **自动配置** - 自动注入 `@dev-to/react-plugin` 到项目
- 🎨 **丰富的模板** - TypeScript、JavaScript、SWC 等多种选择
- 📦 **包管理器无关** - 支持 pnpm、npm、yarn、bun

## 使用方法

### 方式一：使用 create 命令（推荐）

```bash
# 使用 pnpm
pnpm create dev-to

# 使用 npm
npm create dev-to

# 使用 yarn
yarn create dev-to

# 使用 bun
bun create dev-to
```

### 方式二：直接使用 npx/dlx

```bash
# 使用 pnpm
pnpm dlx create-dev-to

# 使用 npm
npx create-dev-to

# 使用 yarn
yarn dlx create-dev-to

# 使用 bun
bunx create-dev-to
```

## 交互式创建流程

运行命令后，你将看到：

1. **📝 项目名称** - 输入你的项目名称
2. **📦 包管理器** - 选择 pnpm、npm、yarn 或 bun
3. **🎯 框架选择** - 选择 React/Vue（其他框架即将支持）
4. **🎨 模板变体** - 选择 TypeScript、JavaScript、SWC 等
5. **⚡ Rolldown** - 选择是否使用实验性的 Rolldown 打包器
6. **✨ 自动安装** - 美观的进度显示和实时统计

## 支持的框架

| 框架 | 状态 |
|------|------|
| React | ✅ 已支持 |
| Vue | ✅ 已支持 |
| Svelte | 🚧 即将推出 |
| Solid | 🚧 即将推出 |
| Preact | 🚧 即将推出 |
| Lit | 🚧 即将推出 |
| Qwik | 🚧 即将推出 |
| Vanilla | 🚧 即将推出 |

## React 模板

当选择 React 框架时，你可以选择：

- **TypeScript** - 使用 TypeScript 的 React 项目
- **TypeScript + SWC** - 使用 SWC 编译的 TypeScript React 项目（更快的构建速度）
- **JavaScript** - 使用 JavaScript 的 React 项目
- **JavaScript + SWC** - 使用 SWC 编译的 JavaScript React 项目

创建完成后会自动在 `vite.config.*` 中注入 `@dev-to/react-plugin`（`devToReactPlugin()`），并在 `package.json` 中加入 `build:lib`（`dev-to build`，等价于 `vite build --mode lib`）。

## Vue 模板

当选择 Vue 框架时，你可以选择：

- **TypeScript** - 使用 TypeScript 的 Vue 项目
- **JavaScript** - 使用 JavaScript 的 Vue 项目

创建完成后会自动在 `vite.config.*` 中注入 `@dev-to/vue-plugin`（`devToVuePlugin()`）。

## 安装进度展示

我们重新设计了依赖安装体验，提供：

- 📊 **三阶段进度** - 解析（🔍）、下载（⬇️）、安装（📦）
- 🌈 **渐变色进度条** - 美观的视觉反馈
- 📈 **实时统计** - 包数量、耗时、下载速度
- 💾 **磁盘占用** - 显示 node_modules 大小
- 🎨 **自动降级** - 在 CI/CD 环境自动使用简化输出

## 环境变量

你可以通过环境变量自定义行为：

```bash
# 禁用美观的日志输出
INSTALL_LOGGER=false pnpm create dev-to

# 使用简化的日志样式
INSTALL_LOGGER_STYLE=simple pnpm create dev-to
```

## 示例

```bash
$ pnpm create dev-to

┌  create-dev-to
│
◆  Project name:
│  my-awesome-app
│
◆  Select a package manager:
│  ● pnpm
│
◆  Select a framework:
│  ● React
│  ○ Vue
│  ○ Svelte (Coming soon)
│
◆  Select a variant:
│  ● TypeScript
│
◆  Use Rolldown for bundling? (Experimental)
│  No
│
◆  Installing Dependencies
│
│  🔍 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ Resolving packages   100%
│  ⬇️  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ Downloading          100%
│  📦 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ Installing           100%
│
│  Packages: +245  Time: 8.5s  Speed: 2.5 MB/s
│
✨  Installation Complete!
│
│  Packages: +245 added
│  Duration: 8.5s
│  Avg Speed: 2.5 MB/s
│  Disk Usage: 142.8 MB
│
└  Done
```

## License

MIT
