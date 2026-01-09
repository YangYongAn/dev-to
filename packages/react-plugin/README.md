# @dev-to/react-plugin

一个用于 **Vite + React** 的“宿主桥接”插件：在 Vite Dev Server 上暴露稳定的桥接入口（contract/init/runtime/debug），让非 Vite 页面（例如 Electron、旧系统、微前端容器）也能加载并热更新 Vite 侧的 React 组件。

## 安装

```bash
pnpm add -D @dev-to/react-plugin
```

## 使用

在 `vite.config.ts` 中启用：

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { devToReactPlugin } from '@dev-to/react-plugin'

export default defineConfig({
  plugins: [
    react(),
    devToReactPlugin({
      // 组件名 -> 入口路径（相对/绝对路径均可）
      MyCard: 'src/MyCard.tsx',

      // '/' 表示使用默认入口（优先 src/App.*，其次 src/index.*）
      Other: '/'
    })
  ]
})
```

### components 参数形态

- `devToReactPlugin()`：通配符模式（默认 `'*': '/'`），便于开发；但 `vite build --mode lib` 需要显式 componentName。
- `devToReactPlugin('MyCard')`：字符串快捷模式，等价于 `{ MyCard: '/' }`。
- `devToReactPlugin({ MyCard: 'src/MyCard.tsx' })`：显式映射（推荐，且 lib 构建必须）。

## 稳定桥接路径

插件会提供以下稳定路径（v2.0+ 统一命名空间）：

### 框架无关端点（Framework-Agnostic）
- **Discovery** (新): `/__dev_to__/discovery.json` - 统一发现端点，包含框架信息、服务器元数据、所有可用端点
- **Debug HTML**: `/__dev_to__/debug.html` - 可视化调试面板
- **Debug JSON**: `/__dev_to__/debug.json` - JSON 格式的调试信息

### React 专用端点（React-Specific）
- **Contract** (兼容): `/__dev_to__/react/contract.js` - 桥接合约
- **Init**: `/__dev_to__/react/init.js` - 安装 HMR + React Refresh preamble
- **Runtime**: `/__dev_to__/react/runtime.js` - React + ReactDOMClient
- **Loader UMD**: `/__dev_to__/react/loader.js` - ReactLoader UMD 构建
- **Component Loaders**: `/__dev_to__/react/loader/{ComponentName}.js` - 单组件加载器

这些路径与事件名常量集中在 `@dev-to/react-shared`，用于保证 Vite 侧与宿主侧协议一致。

### HMR 事件
- Full Reload: `dev_to:react:full-reload`
- HMR Update: `dev_to:react:hmr-update`

## 生产构建（Library Mode）

执行 `vite build --mode lib` 时，插件会按 `components` 参数为每个组件产出一个 UMD bundle，默认输出到 `dist/<component>/`。

> 提示：`'*': '/'` 的通配符模式仅适合开发；lib 构建请显式列出组件名。

## 与 @dev-to/react-loader 配套

宿主侧建议使用 `@dev-to/react-loader` 的 `ReactLoader`，它会自动：

- 拉取 contract
- 先加载 init（确保 Fast Refresh 生效）
- 再加载 React Runtime 与目标模块
- 监听 full-reload 事件并触发热重载
