# @dev-to/react-playground

一个基于 **Rspack** 的宿主演练场，用于消费 `@dev-to/react-loader`。

## 使用

1. 启动 Vite dev server（远程组件提供方）：

```bash
pnpm -C packages/react-template dev
```

2. 启动 Rspack 宿主：

```bash
pnpm -C packages/react-playground dev
```

默认会从 `http://localhost:5173` 远程加载 `RemoteCard`。

