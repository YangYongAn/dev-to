# @dev-to/react-template

一个基于 **Vite + React** 的演示项目，用来消费 `@dev-to/react-plugin`，同时也可作为 dev server 的 HelloWorld。

## 使用

```bash
pnpm -C packages/react-template dev
```

默认端口为 `5173`（配置了 `strictPort`），并通过 `devToReactPlugin` 暴露稳定桥接端点。

## 供 @dev-to/react-loader 远程加载

示例远程组件：

- `RemoteCard` -> `src/RemoteCard/index.tsx`

可以在宿主侧（例如 `react-playground`）里用：

```tsx
<ReactLoader origin="http://localhost:5173" name="RemoteCard" componentProps={{ title: 'Hello' }} />
```
