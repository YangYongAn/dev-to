# @dev-to/react-loader

在宿主页面中动态加载 **Vite Dev Server** 上的 React 组件，并保持 React Fast Refresh/HMR 能力。

该包默认与 `@dev-to/react-plugin`（Vite 侧）配套使用。

## 安装

```bash
pnpm add @dev-to/react-loader
```

## 前置条件（Vite 侧）

确保你的 Vite 项目启用了 `@dev-to/react-plugin`：

```ts
import { devToReactPlugin } from '@dev-to/react-plugin'

devToReactPlugin({ MyCard: 'src/MyCard.tsx' })
```

## 使用

```tsx
import { ReactLoader } from '@dev-to/react-loader'

export function Demo() {
  return (
    <ReactLoader
      origin="http://localhost:5173"
      name="MyCard"
      componentProps={{ title: 'Hello' }}
    />
  )
}
```

### 直接 URL 模式

如果你已经拿到完整入口 URL，也可以绕过内部解析：

```tsx
<ReactLoader url="http://localhost:5173/@fs/abs/path/to/MyCard.tsx" componentProps={{}} />
```

## 默认桥接端点

### v2.0+ 统一发现端点（推荐）
- **Discovery**: `/__dev_to__/discovery.json` - 统一发现端点，包含所有配置信息

### React 专用端点（兼容）
- **Contract**: `/__dev_to__/react/contract.js` - 桥接合约
- **Init**: `/__dev_to__/react/init.js` - 初始化脚本

这些端点常量由 `@dev-to/react-shared` 统一定义，保证与 `@dev-to/react-plugin` 保持一致。

可通过 `contractEndpoint` 自定义 contract 路径；init 路径由 contract 返回值决定（未提供时回退到默认值）。

### 新增功能（v2.0+）

使用新的发现端点 API：

```tsx
import { loadDiscoveryContract } from '@dev-to/react-loader'

// 加载统一发现合约
const discovery = await loadDiscoveryContract('http://localhost:5173')

console.log(discovery.framework.type)    // 'react'
console.log(discovery.framework.version) // '18.2.0'
console.log(discovery.server.origins)     // 所有可用的 origin
console.log(discovery.components)         // 组件映射
```

## 导出内容

### React 组件
- `ReactLoader` - 主加载器组件

### 底层能力
- `loadDiscoveryContract` - (新) 加载统一发现合约
- `loadBridgeContract` - 加载桥接合约（兼容旧版）
- `ensureBridgeInit` - 确保 HMR 运行时初始化
- `resolveReactEntry` - 解析组件入口 URL
- `resolveReactEntryForLoader` - 带错误处理的入口解析

### 常量
- `DEFAULT_DISCOVERY_ENDPOINT` - (新) 默认发现端点
- `DEFAULT_CONTRACT_ENDPOINT` - 默认合约端点
- `DEFAULT_INIT_ENDPOINT` - 默认初始化端点
