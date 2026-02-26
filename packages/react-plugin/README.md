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

- `devToReactPlugin()`：通配符模式（默认 `'*': '/'`），便于开发；但 `dev-to build`（等价于 `vite build --mode lib`）需要显式 componentName。
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

这些路径与事件名常量集中在 `@dev-to/shared`，用于保证 Vite 侧与宿主侧协议一致。

### HMR 事件
- Full Reload: `dev_to:react:full-reload`
- HMR Update: `dev_to:react:hmr-update`

## 生产构建（Library Mode）

执行 `dev-to build`（等价于 `vite build --mode lib`）时，插件会按 `components` 参数为每个组件产出一个 UMD bundle，默认输出到 `dist/<component>/`。
支持透传 Vite build 参数，例如：`dev-to build --sourcemap --outDir dist-lib`。

> 提示：`'*': '/'` 的通配符模式仅适合开发；lib 构建请显式列出组件名。

### CDN 部署配置

如果你需要将构建产物部署到 CDN（如 OSS、CDN 等），可以配置静态资源的 base URL。以下是三种推荐方案：

#### 方案 1：使用 `experimental.renderBuiltUrl`（推荐）

这种方式**只影响构建产物**中的静态资源路径，不影响开发环境：

```ts
export default defineConfig(({ command, mode }) => {
  const isLibBuild = command === 'build' && mode === 'lib';

  return {
    base: '/', // 保持默认，不影响开发环境

    // 只在构建时修改静态资源的 URL
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        // 只在库构建时，且是 JS 中引用的资源时，添加 CDN 前缀
        if (isLibBuild && hostType === 'js') {
          return `https://cdn.example.com/your-app/${filename}`;
        }
        return { relative: true };
      }
    },

    plugins: [react(), devToReactPlugin('MyComponent')],
  };
});
```

#### 方案 2：使用 `build.rollupOptions`

通过 Rollup 配置自定义资源路径：

```ts
export default defineConfig(({ command, mode }) => {
  const cdnBase = 'https://cdn.example.com/your-app/';
  const isLibBuild = command === 'build' && mode === 'lib';

  return {
    base: '/',
    plugins: [
      react(),
      devToReactPlugin('MyComponent', {
        build: {
          rollupOptions: {
            output: {
              assetFileNames: (assetInfo) => {
                if (isLibBuild && assetInfo?.name) {
                  const name = assetInfo.name;
                  if (name.endsWith('.css')) {
                    return 'MyComponent.css';
                  }
                  // 为其他静态资源添加 CDN 前缀
                  return cdnBase + 'assets/[name]-[hash][extname]';
                }
                return 'assets/[name]-[hash][extname]';
              }
            }
          }
        }
      })
    ],
  };
});
```

#### 方案 3：条件设置 `base`

通过条件判断，只在库构建时设置 CDN base：

```ts
export default defineConfig(({ command, mode }) => {
  const base = command === 'build' && mode === 'lib'
    ? 'https://cdn.example.com/your-app/'
    : '/';

  return {
    base,
    plugins: [react(), devToReactPlugin('MyComponent')],
  };
});
```

**优点**：
- ✅ 配置简单直接
- ✅ 开发环境 base 为 `/`，不影响访问
- ✅ 构建时所有资源自动使用 CDN 路径

**说明**：
- `/__dev_to__/` 开头的所有桥接路径（如 `/__dev_to__/react/contract.js`）**不受 `base` 配置影响**
- 插件内部已处理路径规范化，无论设置什么 `base` 值，桥接路径在开发和生产环境都保持稳定
- 这确保了开发体验的一致性

## 与 @dev-to/react-loader 配套

宿主侧建议使用 `@dev-to/react-loader` 的 `ReactLoader`，它会自动：

- 拉取 contract
- 先加载 init（确保 Fast Refresh 生效）
- 再加载 React Runtime 与目标模块
- 监听 full-reload 事件并触发热重载
