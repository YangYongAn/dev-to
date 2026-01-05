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

- Contract：`/__dev_to_react__/contract.js`
- Init：`/__dev_to_react__/init.js`

这些端点常量由 `@dev-to/react-shared` 统一定义，保证与 `@dev-to/react-plugin` 保持一致。

可通过 `contractEndpoint` 自定义 contract 路径；init 路径由 contract 返回值决定（未提供时回退到默认值）。

## 导出内容

- React 组件：`ReactLoader`
- 底层能力：`loadBridgeContract` / `ensureBridgeInit` / `resolveReactEntry` / `resolveReactEntryForLoader`
