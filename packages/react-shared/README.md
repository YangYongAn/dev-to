# @dev-to/react-shared

React 相关的共享常量与协议类型，用于 `@dev-to/react-plugin`（Vite 侧）与 `@dev-to/react-loader`（宿主侧）之间保持一致。

## 主要内容

- 统一的桥接 URL 前缀：`/__dev_to_react__/...`
- 稳定端点路径：`contract/init/react-runtime/debug`
- 事件名常量：`fullReload` / `hmrUpdate`
- 合约类型：`DevToReactBridgeContract`

