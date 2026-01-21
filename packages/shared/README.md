# @dev-to/shared

DevTo 共享常量与协议类型，用于框架插件与宿主加载器之间保持一致（React/Vue）。

## 主要内容

### v2.0+ 统一命名空间
- **统一的桥接 URL 前缀**: `/__dev_to__/` (框架无关)
- **React 专用前缀**: `/__dev_to__/react/` (React 框架专用)
- **Vue 专用前缀**: `/__dev_to__/vue/` (Vue 框架专用)

### 稳定端点路径
- **Discovery** (新): `/__dev_to__/discovery.json` - 统一发现端点
- **Debug**: `/__dev_to__/debug.html` / `debug.json` - 调试面板
- **React Contract**: `/__dev_to__/react/contract.js` - React 桥接合约
- **React Init**: `/__dev_to__/react/init.js` - 初始化脚本
- **React Runtime**: `/__dev_to__/react/runtime.js` - React 运行时
- **React Loader**: `/__dev_to__/react/loader.js` - 加载器 UMD
- **Vue Contract**: `/__dev_to__/vue/contract.js` - Vue 桥接合约
- **Vue Init**: `/__dev_to__/vue/init.js` - 初始化脚本
- **Vue Runtime**: `/__dev_to__/vue/runtime.js` - Vue 运行时
- **Vue Loader**: `/__dev_to__/vue/loader.js` - 加载器 UMD

### 事件名常量
- React Full Reload: `dev_to:react:full-reload`
- React HMR Update: `dev_to:react:hmr-update`
- Vue Full Reload: `dev_to:vue:full-reload`
- Vue HMR Update: `dev_to:vue:hmr-update`

### 合约类型
- `DevToDiscoveryContract` - (新) 统一发现合约接口
- `DevToReactBridgeContract` - React 桥接合约接口（兼容）
- `DevToVueBridgeContract` - Vue 桥接合约接口
