# 开发者指南 (For AI Agents & Developers)

本文档为 AI Agent（如 Claude Code）和开发者提供项目开发规范。

---

## 📦 项目概述

**dev-to** 是一个面向 **AI Agent 平台**和**智能体容器**的 React 组件开发工具链，支持跨环境热加载（HMR）和生产级调试。

### 技术栈

- **包管理器**: pnpm 9.0.0 (workspace monorepo)
- **构建工具**: Vite 5.4.11, Rslib (基于 Rspack)
- **版本管理**: Changesets (自动化版本管理和 changelog 生成)
- **代码规范**: ESLint 9 (Flat Config), TypeScript 5.4.5
- **提交规范**: Conventional Commits + commitlint
- **Git Hooks**: husky + lint-staged

---

## 📂 包结构与依赖关系

### 核心包（已发布到 npm）

| 包名 | 版本 | 用途 | 技术栈 | 依赖关系 |
|------|------|------|--------|---------|
| **@dev-to/react-shared** | 0.1.0 | 桥接协议和常量定义 | TypeScript | 无依赖（基础层） |
| **@dev-to/react-plugin** | 0.1.1 | Vite 插件（组件提供方） | Rslib, picocolors | 依赖 react-shared |
| **@dev-to/react-loader** | 0.1.0 | 宿主侧加载器组件 | Rslib, React 18 | 依赖 react-shared |
| **@dev-to/create-react** | 1.0.1 | 脚手架工具 | TypeScript, @clack/prompts | 独立（CLI 工具） |

### 示例包（私有，不发布）

| 包名 | 用途 | 技术栈 |
|------|------|--------|
| **@dev-to/react-template** | Vite 组件提供方示例 | Vite, React 18, Less |
| **@dev-to/react-playground** | Rsbuild 宿主应用示例 | Rsbuild, React 18 |

### 依赖关系图

```
@dev-to/react-shared (基础协议层)
  ├── @dev-to/react-plugin (Vite 侧插件)
  │   └── @dev-to/react-template (示例)
  │
  └── @dev-to/react-loader (宿主侧加载器)
      └── @dev-to/react-playground (示例)

@dev-to/create-react (独立 CLI 工具)
```

---

## 🚀 开发命令

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 监听模式构建（开发推荐）
pnpm dev

# 代码检查
pnpm lint

# 运行示例项目
cd packages/react-template && pnpm dev     # Terminal 1 (port 5173)
cd packages/react-playground && pnpm dev   # Terminal 2 (port 8080)
```

---

## 📝 Commit 规范 (Conventional Commits + Scope)

本仓库使用 **Conventional Commits** 并**强制要求 scope**，以支持 **per-package changelogs** (通过 Changesets 实现)。

### 格式

```
<type>(<scope>)!: <subject>

[optional body]

[optional footer]
```

- **type**: `feat` | `fix` | `perf` | `refactor` | `docs` | `test` | `build` | `ci` | `chore` | `revert`
- **scope**: **必填**，使用下表中的包名或特殊 scope
- **!** / **BREAKING CHANGE:** 标记破坏性变更（触发 major 版本升级）

### Scope 列表

**包相关 scope**（对应 `packages/` 下的目录名）:

- `create-react` - 脚手架工具
- `react-loader` - 宿主侧加载器
- `react-playground` - 示例项目（宿主应用）
- `react-plugin` - Vite 插件
- `react-shared` - 共享协议
- `react-template` - 示例项目（组件提供方）

**特殊 scope**（跨包或基础设施）:

- `repo` - monorepo 级别的配置变更（如 pnpm-workspace.yaml, tsconfig.base.json）
- `deps` - 依赖版本升级（如 `chore(deps): bump vite to 5.4.11`）
- `ci` - CI/CD 配置变更（如 GitHub Actions）

### 示例

```bash
# ✅ 正确示例
feat(react-plugin): add debug panel color highlighting
fix(react-loader): resolve HMR event timing issue
docs(react-template): add remote card demos
chore(repo): update workspace tooling
chore(deps): bump vite to 5.4.11

# ❌ 错误示例
feat: add new feature                    # 缺少 scope
feat(plugins): something                 # scope 不在允许列表中
fix(react-plugin,react-loader): xxx     # 不允许多个 scope
```

### 多包变更处理

如果一次变更影响多个包：

1. **推荐**: 拆分成多个 commit，每个 commit 对应一个包
2. **次选**: 使用 `repo` scope，在 body 中列出所有受影响的包

```bash
# 推荐方式
git commit -m "feat(react-plugin): add new API"
git commit -m "feat(react-loader): consume new API from plugin"

# 次选方式
git commit -m "feat(repo): add cross-package feature

Affected packages:
- @dev-to/react-plugin
- @dev-to/react-loader"
```

---

## 🔄 版本管理与发布 (Changesets)

本项目使用 [Changesets](https://github.com/changesets/changesets) 管理版本和自动生成 CHANGELOG。

### 工作流程

```bash
# 1. 开发完成后，创建 changeset（记录变更）
pnpm changeset

# 交互式选择:
# - 哪些包受到影响
# - 版本变更类型 (major/minor/patch)
# - 变更描述 (会写入 CHANGELOG)

# 2. 提交 changeset 文件
git add .changeset/xxx.md
git commit -m "chore(repo): add changeset for xxx"

# 3. 发布时，更新版本号和 CHANGELOG
pnpm changeset version

# 4. 提交版本变更
git add .
git commit -m "chore(repo): release packages"

# 5. 发布到 npm
pnpm changeset publish

# 6. 推送 tags
git push --follow-tags
```

### Changeset 文件示例

```markdown
---
"@dev-to/react-plugin": patch
"@dev-to/react-loader": patch
---

fix: add colored URL output in terminal

- Use picocolors to highlight debug panel URLs
- Remove dev server spinner to prevent output interference
```

### 版本语义（Semantic Versioning）

- **major (x.0.0)**: 破坏性变更（BREAKING CHANGE）
- **minor (0.x.0)**: 新功能（feat）
- **patch (0.0.x)**: Bug 修复（fix）、文档、chore 等

---

## 🛠️ 包管理器特性

### pnpm workspace

- **workspace protocol**: 内部包依赖使用 `workspace:*`
- **共享依赖**: 公共依赖安装在根目录 `node_modules/`
- **隔离安装**: 每个包可独立安装特定依赖

### 常用命令

```bash
# 为特定包添加依赖
pnpm add <pkg> --filter @dev-to/react-plugin

# 为所有包添加依赖
pnpm add <pkg> -w

# 在特定包中运行脚本
pnpm --filter @dev-to/react-plugin build

# 在所有包中并行运行脚本
pnpm -r --parallel dev
```

---

## 🎯 开发注意事项

### 1. 代码质量

- ✅ 所有改动必须通过 ESLint 检查
- ✅ 提交时会自动运行 lint-staged（仅检查暂存文件）
- ✅ 提交信息必须符合 commitlint 规则

### 2. 包依赖原则

- **react-shared**: 不依赖任何内部包，保持纯净
- **react-plugin / react-loader**: 只依赖 react-shared
- **示例项目**: 可依赖所有核心包

### 3. 构建顺序

依赖关系决定了构建顺序，pnpm 会自动处理：

```
1. react-shared (无依赖)
2. react-plugin, react-loader (依赖 shared)
3. create-react (独立)
4. react-template, react-playground (依赖 plugin/loader)
```

### 4. 发布清单

发布前检查：

- [ ] 所有包都已构建 (`pnpm build`)
- [ ] 所有测试通过 (`pnpm test`)
- [ ] 已创建 changeset
- [ ] 版本号已更新 (`pnpm changeset version`)
- [ ] CHANGELOG 已生成
- [ ] 提交信息符合规范

---

## 🤖 AI Agent 专用提示

### 推荐操作流程

1. **修改代码前**: 先阅读相关包的源码和 README
2. **提交代码时**: 严格遵守 Conventional Commits 格式
3. **创建 changeset**: 对于功能/修复，使用 `pnpm changeset` 创建变更记录
4. **测试构建**: 修改后运行 `pnpm build` 确保构建成功

### 常见任务示例

**添加新功能到 react-plugin**:
```bash
# 1. 修改代码
# 2. 构建测试
pnpm --filter @dev-to/react-plugin build

# 3. 创建 changeset
pnpm changeset
# 选择: react-plugin, minor, 描述功能

# 4. 提交
git add .
git commit -m "feat(react-plugin): add new feature X"
```

**修复 bug**:
```bash
# 1. 修改代码
# 2. 创建 changeset
pnpm changeset
# 选择: 受影响的包, patch, 描述修复

# 3. 提交
git commit -m "fix(react-loader): resolve issue Y"
```

**更新文档**:
```bash
# 无需 changeset（文档变更通常不触发版本升级）
git commit -m "docs(repo): update README"
```

---

## 📚 参考资料

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Changesets 文档](https://github.com/changesets/changesets/tree/main/docs)
- [pnpm workspace](https://pnpm.io/workspaces)
- [Semantic Versioning](https://semver.org/)

---

## ❓ FAQ

**Q: 为什么强制要求 scope？**
A: Changesets 通过 commit scope 将变更归属到对应的包，生成 per-package CHANGELOG。错误的 scope 会导致 changelog 混乱。

**Q: 什么时候需要创建 changeset？**
A: 所有会影响已发布包的变更（feat, fix, perf, refactor）都需要 changeset。文档、CI 等不影响包行为的变更可以不创建。

**Q: 如何回滚错误的发布？**
A: 使用 `npm deprecate` 标记错误版本，然后发布新的 patch 版本修复问题。不建议删除已发布的版本。

**Q: 示例项目需要发布吗？**
A: 不需要，react-template 和 react-playground 的 `package.json` 中设置了 `"private": true`，不会被发布。
