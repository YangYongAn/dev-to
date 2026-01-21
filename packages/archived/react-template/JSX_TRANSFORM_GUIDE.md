# JSX Transform 配置问题诊断指南

## 问题症状

生产环境报错：
```
Minified React error #130
Element type is invalid
```

## 根本原因

**JSX Transform 不一致**：开发环境和生产环境使用了不同的 JSX transform 模式。

### Automatic JSX Transform (React 17+)

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx"  // ← automatic mode
  }
}
```

**特点**:
- ✅ 不需要 `import React from 'react'`
- ✅ 自动注入 JSX runtime
- ❌ 需要构建工具支持

**生成代码示例**:
```javascript
import { jsx as _jsx } from 'react/jsx-runtime';
function App() {
  return _jsx('div', { children: 'Hello' });
}
```

### Classic JSX Transform (Legacy)

```typescript
// vite.config.ts (lib build)
{
  esbuild: {
    jsx: 'transform',  // ← classic mode
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  }
}
```

**特点**:
- ❌ 必须 `import React from 'react'`
- ✅ 兼容性好
- ✅ UMD 友好

**生成代码示例**:
```javascript
import React from 'react';
function App() {
  return React.createElement('div', null, 'Hello');
}
```

## 解决方案

### 方案 1: 统一使用 Automatic JSX（推荐）

**步骤**:

1. **确保所有组件文件不需要显式导入 React**（已经是这样）

2. **检查生产构建配置**：确保使用 automatic JSX

3. **Vite 配置更新**（如果需要）:
```typescript
// vite.config.ts
export default defineConfig({
  esbuild: {
    jsx: 'automatic',  // 使用 automatic JSX
    jsxImportSource: 'react'
  }
})
```

### 方案 2: 统一使用 Classic JSX

**步骤**:

1. **更新 tsconfig.json**:
```json
{
  "compilerOptions": {
    "jsx": "react"  // 改为 classic
  }
}
```

2. **在所有组件文件顶部添加**:
```typescript
import React from 'react'
```

3. **确保生产构建也使用 classic**

### 方案 3: 混合模式（仅当必要）

如果必须支持两种模式，需要确保：

1. **在 UMD loader 中注入 React 到全局**（已实现）:
```javascript
if (typeof window !== 'undefined' && !window.React && React) {
  window.React = React;
}
```

2. **组件必须显式导入 React**:
```typescript
import React from 'react'  // ← 必需!

export default function MyComponent() {
  return <div>Hello</div>
}
```

## 当前项目状态

### 开发环境
- ✅ TypeScript: `"jsx": "react-jsx"` (automatic)
- ✅ Vite dev server: 支持 automatic JSX
- ✅ 组件没有显式 React import

### 生产环境（可能的问题）
- ❓ 构建工具可能使用 classic JSX
- ❓ 组件缺少 React import
- ❓ UMD 环境中 React 未正确注入

## 检查清单

### 1. 确认你的构建配置

```bash
# 检查生产构建的 JSX transform
grep -r "jsx.*transform" vite.config.ts
grep -r "jsxFactory" vite.config.ts
```

### 2. 检查组件文件

```typescript
// ❌ 如果使用 classic JSX，这样会报错
export default function MyComponent() {
  return <div>Hello</div>  // React is not defined!
}

// ✅ Classic JSX 正确写法
import React from 'react'
export default function MyComponent() {
  return <div>Hello</div>
}

// ✅ Automatic JSX 正确写法（推荐）
export default function MyComponent() {
  return <div>Hello</div>  // 自动处理
}
```

### 3. 检查控制台输出

打开浏览器控制台，查看：
- `[dev_to_react] Module exports: ...` - 显示可用的导出
- `[dev_to_react] Component is not a valid React component` - 组件类型错误

## 快速修复（临时）

如果急需修复，最快的方法是在所有组件文件顶部添加：

```typescript
import React from 'react'
```

然后重新构建。

## 长期解决方案

统一项目的 JSX transform 配置：

1. **推荐**: 全部使用 automatic JSX（React 17+）
2. **备选**: 全部使用 classic JSX（如果需要兼容旧环境）

## 需要帮助？

如果问题仍然存在，请提供：
1. 完整的错误堆栈
2. 生产构建的配置文件
3. 组件代码示例
4. 控制台日志（包括 `[dev_to_react]` 开头的）
