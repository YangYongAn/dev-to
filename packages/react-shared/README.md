# @dev-to/react-shared

React 相关的共享常量与协议类型，用于 `@dev-to/react-plugin`（Vite 侧）与 `@dev-to/react-loader`（宿主侧）之间保持一致。

## 主要内容

### v2.0+ 统一命名空间
- **统一的桥接 URL 前缀**: `/__dev_to__/` (框架无关)
- **React 专用前缀**: `/__dev_to__/react/` (React 框架专用)

### 稳定端点路径
- **Discovery** (新): `/__dev_to__/discovery.json` - 统一发现端点
- **Debug**: `/__dev_to__/debug.html` / `debug.json` - 调试面板
- **Contract**: `/__dev_to__/react/contract.js` - React 桥接合约
- **Init**: `/__dev_to__/react/init.js` - 初始化脚本
- **Runtime**: `/__dev_to__/react/runtime.js` - React 运行时
- **Loader**: `/__dev_to__/react/loader.js` - 加载器 UMD

### 事件名常量
- Full Reload: `dev_to:react:full-reload` (框架作用域)
- HMR Update: `dev_to:react:hmr-update` (框架作用域)

### 合约类型
- `DevToDiscoveryContract` - (新) 统一发现合约接口
- `DevToReactBridgeContract` - React 桥接合约接口（兼容）

