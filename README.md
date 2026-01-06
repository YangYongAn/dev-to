# dev-to

一套为 React 组件提供"跨环境热加载"能力的完整工具链。

## 💡 为什么需要它？

在微前端、旧系统重构、Electron 应用、或需要跨域加载组件的场景中，我们经常遇到以下痛点：

1. **环境受限**: 组件必须运行在特定的宿主页面中，但该页面并非由 Vite 启动
2. **热更新失效**: 无法在外部宿主中享受 React Fast Refresh 的开发体验
3. **资源路径破碎**: 相对路径引用的图片、字体在宿主环境中 404
4. **运行时冲突**: 宿主和组件使用了多个 React 实例，导致 Hook 报错

**dev-to** 旨在解决这些问题，让开发者在任何环境下都能拥有"原生级"的 Vite 开发体验。

---

## ✨ 核心特性

- ⚡ **跨环境 HMR**: 让非 Vite 启动的宿主页面也能支持完整的 React 热更新
- 🖼️ **资源智能重定向**: 自动将源码中的相对资源路径重定向至 Vite 开发服务器
- 🔗 **运行时共享**: 提供统一的 React 运行实例，避免 Hook 状态冲突
- 📦 **自动化 UMD 构建**: 支持一键将多个组件打包为独立的 UMD 产物
- 🛠️ **内置调试面板**: 提供可视化监控，实时查看桥接状态和 HMR 统计
- 🚀 **快速脚手架**: 一键创建集成完整工具链的 React 项目

---

## 📦 Packages

| Package | Version | 说明 |
|---------|---------|------|
| [@dev-to/react-plugin](./packages/react-plugin) | [![npm](https://img.shields.io/npm/v/@dev-to/react-plugin.svg)](https://www.npmjs.com/package/@dev-to/react-plugin) | **Vite 侧插件** - 在 Vite Dev Server 上暴露稳定的桥接入口 |
| [@dev-to/react-loader](./packages/react-loader) | [![npm](https://img.shields.io/npm/v/@dev-to/react-loader.svg)](https://www.npmjs.com/package/@dev-to/react-loader) | **宿主侧加载器** - 在任意页面中动态加载远程 React 组件 |
| [@dev-to/create-react](./packages/create-react) | [![npm](https://img.shields.io/npm/v/@dev-to/create-react.svg)](https://www.npmjs.com/package/@dev-to/create-react) | **脚手架工具** - 快速创建集成 dev-to 的 React 项目 |
| [@dev-to/react-shared](./packages/react-shared) | [![npm](https://img.shields.io/npm/v/@dev-to/react-shared.svg)](https://www.npmjs.com/package/@dev-to/react-shared) | **共享协议** - Vite 侧与宿主侧的通信协议和类型定义 |
| @dev-to/react-template | - | **示例项目** - 演示 Vite 组件提供方的完整实现 |
| @dev-to/react-playground | - | **示例项目** - 演示宿主应用如何加载远程组件 |

---

## 🏗️ 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        宿主应用 (任意环境)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  @dev-to/react-loader                                     │   │
│  │  ├─ 加载 contract.js (获取桥接端点)                        │   │
│  │  ├─ 加载 init.js (注入 React Refresh)                     │   │
│  │  ├─ 加载 react-runtime.js (获取统一 React 实例)           │   │
│  │  └─ 动态 import 目标组件 (ESM)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ▲                                   │
│                              │ HTTP (跨域/同域)                  │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Vite Dev Server (组件提供方)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  @dev-to/react-plugin                                     │   │
│  │  ├─ 暴露稳定端点:                                          │   │
│  │  │  ├─ /__dev_to_react__/contract.js                     │   │
│  │  │  ├─ /__dev_to_react__/init.js                         │   │
│  │  │  ├─ /__dev_to_react__/react-runtime.js                │   │
│  │  │  └─ /__dev_to_react__/debug.html                      │   │
│  │  ├─ 转换 CSS 中的资源 URL (相对路径 → 完整 URL)            │   │
│  │  ├─ 监听 HMR 事件并桥接到宿主                              │   │
│  │  └─ Library Build: 产出 UMD 包                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 核心通信协议

**Bridge Contract** - 桥接合约 (`contract.js`)

```typescript
{
  paths: {
    contract: '/__dev_to_react__/contract.js',
    initClient: '/__dev_to_react__/init.js',
    reactRuntime: '/__dev_to_react__/react-runtime.js'
  },
  events: {
    fullReload: 'dev_to_react:full-reload',
    hmrUpdate: 'dev_to_react:hmr-update'
  },
  dev: {
    componentMap: {
      'MyCard': 'src/components/MyCard.tsx',
      // ...
    }
  }
}
```

### 包依赖关系

```
@dev-to/react-shared (基础协议层)
  ├── @dev-to/react-plugin (Vite 侧)
  │   └── @dev-to/react-template (示例)
  │
  └── @dev-to/react-loader (宿主侧)
      └── @dev-to/react-playground (示例)

@dev-to/create-react (独立脚手架)
```

---

## 🚀 快速上手

### 方式 1: 使用脚手架创建项目 (推荐)

```bash
# 使用 npx (无需安装)
npx @dev-to/create-react my-app

# 或使用 pnpm
pnpm create @dev-to/react my-app
```

脚手架会自动：
1. 选择包管理器 (pnpm/npm/yarn/bun)
2. 选择 React 模板 (TypeScript/JavaScript)
3. 自动注入 `@dev-to/react-plugin` 到 `vite.config.ts`
4. 安装依赖并启动开发服务器

### 方式 2: 手动集成到现有项目

#### 第一步: 安装插件 (组件提供方)

```bash
npm install @dev-to/react-plugin -D
```

在 `vite.config.ts` 中配置插件：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { devToReactPlugin } from '@dev-to/react-plugin'

export default defineConfig({
  server: {
    port: 5173,
    cors: true, // 重要：允许跨域访问
  },
  plugins: [
    react(),
    devToReactPlugin({
      // 定义哪些组件需要对外暴露
      MyCard: 'src/components/MyCard.tsx',
      MyHeader: 'src/components/Header.tsx',
    }),
  ],
})
```

#### 第二步: 安装加载器 (宿主应用)

```bash
npm install @dev-to/react-loader
```

在宿主应用中使用 `ReactLoader` 组件：

```tsx
import { ReactLoader } from '@dev-to/react-loader'

function App() {
  return (
    <div>
      <h1>宿主应用</h1>

      {/* 加载远程组件 */}
      <ReactLoader
        origin="http://localhost:5173"
        name="MyCard"
        componentProps={{ title: '标题', count: 42 }}
      />
    </div>
  )
}
```

#### 第三步: 启动开发

```bash
# Terminal 1: 启动组件提供方 (Vite)
cd component-provider
npm run dev  # http://localhost:5173

# Terminal 2: 启动宿主应用
cd host-app
npm run dev  # http://localhost:8080

# 访问 http://localhost:8080，修改 MyCard 代码会自动热更新！
```

---

## 📖 使用指南

### 1. 组件映射配置

插件支持多种配置模式：

```typescript
// A. 通配符模式 (适合开发调试)
devToReactPlugin()

// B. 字符串快捷模式
devToReactPlugin('MyCard')

// C. 对象映射模式 (推荐，生产必须)
devToReactPlugin({
  MyCard: 'src/components/MyCard.tsx',
  MyHeader: 'src/components/Header.tsx',
})
```

### 2. ReactLoader 使用方式

```tsx
// 方式 1: 使用 origin + name (推荐)
<ReactLoader
  origin="http://localhost:5173"
  name="MyCard"
  componentProps={{ title: '标题' }}
/>

// 方式 2: 直接指定 URL
<ReactLoader
  url="http://localhost:5173/@fs/path/to/MyCard.tsx"
  componentProps={{ title: '标题' }}
/>
```

### 3. 调试面板

启动 Vite 后访问调试面板：

```
http://localhost:5173/__dev_to_react__/debug.html
```

你可以查看：
- **Contract 状态**: 组件映射配置
- **HMR 统计**: 热更新触发次数和时间
- **资源追踪**: 已重定向的资源列表
- **快速测试**: 复制粘贴示例代码

### 4. 生产构建 (Library Mode)

```bash
# 构建 UMD 包
vite build --mode lib

# 输出结构:
# dist/
#   MyCard/
#     MyCard.js       # UMD bundle
#     MyCard.css      # 样式文件 (如有)
#     MyCard.d.ts     # 类型定义
#   MyHeader/
#     MyHeader.js
#     ...
```

UMD 包可以在任何环境中使用：

```html
<script src="https://cdn.example.com/react.js"></script>
<script src="https://cdn.example.com/react-dom.js"></script>
<script src="/dist/MyCard/MyCard.js"></script>

<script>
  const { MyCard } = window.MyCard
  // 使用组件...
</script>
```

---

## ⚙️ 高级配置

### 插件选项

```typescript
devToReactPlugin(componentMap, {
  // 是否自动打开调试面板
  open: false,

  // CSS 配置 (透传给 Vite)
  css: {
    modules: {
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },

  // 构建配置 (仅 lib 模式)
  build: {
    minify: true,
    sourcemap: true,
  },
})
```

### ReactLoader Props

```typescript
interface ReactLoaderProps {
  // 组件提供方的 origin (与 name 配合使用)
  origin?: string

  // 组件名称 (在 componentMap 中定义的 key)
  name?: string

  // 或直接指定完整 URL
  url?: string

  // 传递给远程组件的 props
  componentProps?: Record<string, any>

  // 自定义 contract 端点 (通常不需要)
  contractEndpoint?: string
}
```

---

## 🛠️ 开发指南 (本仓库)

### 环境准备

```bash
# 克隆仓库
git clone https://github.com/YangYongAn/dev-to.git
cd dev-to

# 安装依赖 (使用 pnpm)
pnpm install
```

### 开发命令

```bash
# 构建所有包
pnpm build

# 监听模式构建
pnpm dev

# 代码检查
pnpm lint

# 运行测试
pnpm test
```

### 运行示例项目

```bash
# Terminal 1: 启动组件提供方 (react-template)
cd packages/react-template
pnpm dev  # http://localhost:5173

# Terminal 2: 启动宿主应用 (react-playground)
cd packages/react-playground
pnpm dev  # http://localhost:8080

# 访问 http://localhost:8080 查看效果
# 修改 packages/react-template/src/RemoteCard/ 中的代码，查看 HMR 效果
```

### 发布流程

本项目使用 [Changesets](https://github.com/changesets/changesets) 管理版本和发布：

```bash
# 1. 创建 changeset (记录变更)
pnpm changeset

# 2. 更新版本号和 CHANGELOG
pnpm changeset version

# 3. 发布到 npm
pnpm changeset publish

# 4. 推送 tags
git push --follow-tags
```

### Commit 规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```bash
# 格式: <type>(scope): <subject>
# scope 必须是以下之一:
# - create-react
# - react-loader
# - react-playground
# - react-plugin
# - react-shared
# - react-template
# - repo
# - deps
# - ci

# 示例:
git commit -m "feat(react-plugin): add debug panel"
git commit -m "fix(react-loader): resolve HMR event timing issue"
git commit -m "docs(repo): update README"
```

---

## 🎯 使用场景

### 1. 微前端开发

在主应用中动态加载子应用的 React 组件，保持热更新能力：

```tsx
<ReactLoader
  origin="http://localhost:3001"
  name="UserDashboard"
  componentProps={{ userId: 123 }}
/>
```

### 2. Electron 应用

在 Electron 主窗口中加载独立开发的 React 组件：

```tsx
<ReactLoader
  origin="http://localhost:5173"
  name="SettingsPanel"
/>
```

### 3. 旧系统重构

在不修改主页面的情况下，逐步用 React 组件替换旧的 jQuery 模块：

```html
<!-- 旧页面 (jQuery) -->
<div id="legacy-app">
  <div id="react-container"></div>
</div>

<script type="module">
  import { createRoot } from 'react-dom/client'
  import { ReactLoader } from '@dev-to/react-loader'

  const root = createRoot(document.getElementById('react-container'))
  root.render(
    <ReactLoader origin="http://localhost:5173" name="NewFeature" />
  )
</script>
```

### 4. 组件库开发与预览

为组件库提供实时预览和热更新能力：

```tsx
// 组件库预览工具
<ReactLoader
  origin="http://localhost:5173"
  name={selectedComponent}
  componentProps={propsEditor.values}
/>
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feat/amazing-feature`)
3. 提交更改 (`git commit -m 'feat(react-plugin): add amazing feature'`)
4. 推送到分支 (`git push origin feat/amazing-feature`)
5. 创建 Pull Request

---

## 📄 License

MIT © [YangYongAn](https://github.com/YangYongAn)

---

## 🔗 相关链接

- [npm - @dev-to/react-plugin](https://www.npmjs.com/package/@dev-to/react-plugin)
- [npm - @dev-to/react-loader](https://www.npmjs.com/package/@dev-to/react-loader)
- [npm - @dev-to/create-react](https://www.npmjs.com/package/@dev-to/create-react)
- [GitHub Issues](https://github.com/YangYongAn/dev-to/issues)

---

## ❓ FAQ

<details>
<summary><b>Q: 为什么需要 CORS？</b></summary>

宿主应用和 Vite Dev Server 通常运行在不同端口，属于跨域请求。必须在 Vite 配置中启用 `server.cors: true`。

</details>

<details>
<summary><b>Q: 生产环境如何使用？</b></summary>

生产环境有两种方式：
1. 使用 `vite build --mode lib` 产出的 UMD 包，通过 CDN 或静态服务器分发
2. 部署 Vite Dev Server 到生产环境（不推荐，仅适合内部工具）

</details>

<details>
<summary><b>Q: 支持 Vue/Svelte 吗？</b></summary>

目前仅支持 React。但架构设计是框架无关的，理论上可以扩展支持其他框架。

</details>

<details>
<summary><b>Q: 如何处理样式冲突？</b></summary>

推荐使用 CSS Modules，插件会自动生成稳定的 scoped class name，避免样式冲突。

</details>

<details>
<summary><b>Q: HMR 不工作怎么办？</b></summary>

检查以下几点：
1. Vite 配置中是否启用了 `server.cors`
2. 宿主应用是否正确导入了 `init.js`（ReactLoader 会自动处理）
3. 浏览器控制台是否有错误信息
4. 访问调试面板查看详细状态

</details>
