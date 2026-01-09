# dev-to

一套面向 **AI Agent 平台**和**智能体容器**的 React 组件开发工具链，让第三方开发者享受"本地级"的开发体验。

## 💡 为什么需要它？

随着 AI Agent 和智能体平台的兴起，越来越多的企业（如集团公司、AI 平台）需要构建一个**智能体容器**，允许：
- 🤖 集团内不同业务线开发各自的智能体卡片
- 🔌 第三方开发者为平台提供插件组件
- 🏢 多团队协作，各自维护独立的业务组件

**传统开发模式的痛点：**

1. **宿主环境黑盒**: 组件必须部署到容器才能调试，开发者看不到宿主内部细节
2. **调试反馈慢**: 每次修改都要重新构建、部署，无法享受热更新（HMR）
3. **生产环境难调试**: 线上问题无法像本地一样打断点、查看日志
4. **资源路径问题**: 组件中的图片、字体等资源在容器环境中 404
5. **运行时冲突**: 容器和组件各自的 React 实例冲突，导致 Hook 报错

**dev-to 的解决方案：**

✨ **宿主细节隐藏，组件逻辑透明**
- 开发者无需关心容器的复杂性，专注于自己的组件开发
- 在开发模式下，组件内部逻辑完全敞亮，支持断点、日志、热更新

⚡ **本地开发 ≈ 生产调试**
- 在本地 Vite Dev Server 上开发，容器实时加载并热更新
- 生产环境也能享受类似本地的调试体验（可选）

🔗 **标准化桥接协议**
- 统一的组件加载规范，容器和组件解耦
- 支持多团队、跨组织的协作开发

---

## ✨ 核心特性

### 🎯 面向 AI Agent 平台的设计

- **容器 ↔ 组件解耦**: 容器提供标准化的加载接口，组件开发者专注业务逻辑
- **第三方友好**: 外部开发者无需了解容器内部实现，只需按规范开发组件
- **多团队协作**: 集团内各业务线独立维护自己的智能体卡片，互不干扰

### 🚀 极致的开发体验

- ⚡ **跨环境 HMR**: 在本地 Vite 开发，容器实时热更新，秒级反馈
- 🐛 **生产级调试**: 支持在生产环境的容器中加载本地开发版组件，像本地一样调试
- 🔍 **完全透明**: 组件内部断点、日志、源码映射完整可用
- 🖼️ **资源自动处理**: CSS、图片、字体等资源自动重定向到 Vite Dev Server

### 📦 完整的工具链

- 🛠️ **内置调试面板**: 可视化查看组件映射、HMR 统计、资源追踪
- 📤 **UMD 构建**: 一键将组件打包为可独立分发的 UMD 包
- 🚀 **快速脚手架**: 自动生成符合规范的组件项目模板
- 🔗 **运行时共享**: 统一 React 实例，避免多实例冲突

---

## 📦 Packages

| Package | Version | 说明 |
|---------|---------|------|
| [@dev-to/react-plugin](./packages/react-plugin) | [![npm](https://img.shields.io/npm/v/@dev-to/react-plugin.svg)](https://www.npmjs.com/package/@dev-to/react-plugin) | **Vite 侧插件** - 在 Vite Dev Server 上暴露稳定的桥接入口 |
| [@dev-to/react-loader](./packages/react-loader) | [![npm](https://img.shields.io/npm/v/@dev-to/react-loader.svg)](https://www.npmjs.com/package/@dev-to/react-loader) | **宿主侧加载器** - 在任意页面中动态加载远程 React 组件 |
| [create-dev-to](packages/create-dev-to) | [![npm](https://img.shields.io/npm/v/create-dev-to.svg)](https://www.npmjs.com/package/create-dev-to) | **脚手架工具** - 快速创建集成 dev-to 的前端项目（支持多框架） |
| [@dev-to/react-shared](./packages/react-shared) | [![npm](https://img.shields.io/npm/v/@dev-to/react-shared.svg)](https://www.npmjs.com/package/@dev-to/react-shared) | **共享协议** - Vite 侧与宿主侧的通信协议和类型定义 |
| @dev-to/react-template | - | **示例项目** - 演示 Vite 组件提供方的完整实现 |
| @dev-to/react-playground | - | **示例项目** - 演示宿主应用如何加载远程组件 |

---

## 🏗️ 架构设计

### 典型场景：AI Agent 平台 + 第三方开发者

```mermaid
graph TB
    subgraph Container["🏗️ AI Agent 智能体容器 (集团/平台)"]
        subgraph Runtime["容器运行时 (React Application)"]
            R["• 提供统一的 UI 框架 • 管理智能体生命周期 • 处理用户交互和路由"]
        end

        subgraph Loader["@dev-to/react-loader (组件加载层)"]
            L["• 加载远程组件 (开发环境: Vite Dev Server) • 加载远程组件 (生产环境: CDN/静态服务器) • 支持开发/生产无缝切换"]
        end
    end

    Container -->|HTTP/S| DevA
    Container -->|HTTP/S| DevB
    Container -->|HTTP/S| DevC

    subgraph DevA["业务线 A (本地开发)"]
        A["Vite Dev localhost:5173<br/><br/>@dev-to/react-plugin<br/><br/>组件: 客服卡片, 订单卡片"]
    end

    subgraph DevB["业务线 B (本地开发)"]
        B["Vite Dev localhost:5174<br/><br/>@dev-to/react-plugin<br/><br/>组件: 报表卡片, 审批卡片"]
    end

    subgraph DevC["第三方开发者 (本地开发)"]
        C["Vite Dev localhost:5175<br/><br/>@dev-to/react-plugin<br/><br/>组件: 天气插件, 日历插件"]
    end
```

**模式说明：**
- 【开发模式】容器加载 `http://localhost:517X` 上的组件 → 实时 HMR
- 【生产模式】容器加载 CDN 上的 UMD 包 → 稳定运行
- 【生产调试】容器临时切换到 `http://localhost:517X` → 像本地一样调试

### 工作流程

**🔨 组件开发者的视角**

1. 使用脚手架创建组件项目
2. 在本地 Vite Dev Server 开发（如 `localhost:5173`）
3. 告知容器团队组件的访问地址和名称
4. 容器团队在容器中配置加载该组件
5. **开发者修改代码 → 容器中的组件实时热更新** ⚡
6. 调试完成后，构建 UMD 包并部署到 CDN

**🏢 容器团队的视角**

1. 在容器中集成 `@dev-to/react-loader`
2. 配置需要加载的组件列表（可动态配置）
3. 开发环境：加载开发者的本地 Vite Dev Server
4. 生产环境：加载 CDN 上的 UMD 包
5. **无需修改容器代码，新组件即可接入** 🔌

### 核心通信协议

**Bridge Contract** - 桥接合约 (`contract.js`)

```json5
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

create-dev-to (独立脚手架)
```

---

## 🚀 快速上手

### 方式 1: 使用脚手架创建项目 (推荐)

```bash
# 使用 npm，或者 pnpm、yarn、bun 等
npm create dev-to

# 或者直接使用 create-dev-to 命令
npx create-dev-to
```

脚手架会自动：
1. 选择框架 (React、Vue 等，目前 React 已支持)
2. 选择包管理器 (pnpm/npm/yarn/bun)
3. 选择 React 模板 (TypeScript/JavaScript)
4. 自动注入 `@dev-to/react-plugin` 到 `vite.config.ts`
5. 安装依赖并启动开发服务器

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

```js
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
# - create-dev-to
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

### 1. AI Agent 智能体平台（主要场景）

**场景描述**: 集团构建统一的 AI Agent 智能体平台，各业务线或第三方开发者提供智能体卡片（如客服助手、数据看板、工单处理等）

**开发模式**:
```tsx
// 容器中配置加载本地开发中的组件
<ReactLoader
  origin="http://localhost:5173"  // 开发者的本地 Vite
  name="CustomerServiceCard"
  componentProps={{ agentId: 'cs-001' }}
/>
```

**优势**:
- ✅ 开发者在本地开发，修改代码后容器中的卡片实时热更新
- ✅ 容器团队不需要了解每个卡片的内部实现细节
- ✅ 各业务线独立开发、独立部署，互不影响
- ✅ 生产环境出问题时，可临时加载本地版本调试

### 2. 企业微前端平台

在主应用中动态加载子应用的 React 组件，各团队独立维护：

```tsx
<ReactLoader
  origin="http://localhost:3001"  // 业务线 A 的开发服务器
  name="UserDashboard"
  componentProps={{ userId: 123 }}
/>
```

### 3. 低代码/无代码平台的自定义组件

平台提供基础能力，开发者提供自定义组件扩展：

```tsx
// 低代码平台加载第三方开发的自定义图表组件
<ReactLoader
  origin="http://localhost:5173"
  name="CustomChart"
  componentProps={{ dataSource: chartData }}
/>
```

### 4. Electron 桌面应用的插件系统

在 Electron 主窗口中加载独立开发的插件组件：

```tsx
<ReactLoader
  origin="http://localhost:5173"
  name="PluginSettingsPanel"
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
- [npm - create-dev-to](https://www.npmjs.com/package/create-dev-to)
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
