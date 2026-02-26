# 开发者指南 (For AI Agents & Developers)

本文档为 AI Agent（如 Claude Code）和开发者提供项目开发规范。

---

## 📦 项目概述

**dev-to** 是一个面向 **AI Agent 平台**和**智能体容器**的 React/Vue 组件开发工具链，支持跨环境热加载（HMR）和生产级调试。

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
| **@dev-to/shared** | 0.1.0 | 桥接协议和常量定义 | TypeScript | 无依赖（基础层） |
| **@dev-to/react-plugin** | 0.1.1 | Vite 插件（React 组件提供方） | Rslib, picocolors | 依赖 shared |
| **@dev-to/react-loader** | 0.1.0 | 宿主侧加载器组件（React） | Rslib, React 18 | 依赖 shared |
| **@dev-to/vue-plugin** | 0.1.0 | Vite 插件（Vue 组件提供方） | Rslib, Vue 3 | 依赖 shared |
| **@dev-to/vue-loader** | 0.1.0 | 宿主侧加载器组件（Vue） | Rslib, Vue 3 | 依赖 shared |
| **create-dev-to** | 0.0.1 | 脚手架工具 | TypeScript, @clack/prompts | 独立（CLI 工具） |

### 示例包（私有，不发布）

| 包名 | 用途 | 技术栈 |
|------|------|--------|
| **@dev-to/react-template** | Vite React 组件提供方示例 | Vite, React 18, Less |
| **@dev-to/react-playground** | Rsbuild React 宿主应用示例 | Rsbuild, React 18 |
| **@dev-to/vue-template** | Vite Vue 组件提供方示例 | Vite, Vue 3 |
| **@dev-to/vue-playground** | Vite Vue 宿主应用示例 | Vite, Vue 3 |

### 依赖关系图

```
@dev-to/shared (基础协议层)
  ├── @dev-to/react-plugin (Vite 侧插件 - React)
  │   └── @dev-to/react-template (示例)
  │
  ├── @dev-to/react-loader (宿主侧加载器 - React)
  │   └── @dev-to/react-playground (示例)
  │
  ├── @dev-to/vue-plugin (Vite 侧插件 - Vue)
  │   └── @dev-to/vue-template (示例)
  │
  └── @dev-to/vue-loader (宿主侧加载器 - Vue)
      └── @dev-to/vue-playground (示例)

create-dev-to (独立 CLI 工具 - 支持 React & Vue)
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

# 运行 React 示例项目
cd packages/react-template && pnpm dev     # Terminal 1 (port 5173)
cd packages/react-playground && pnpm dev   # Terminal 2 (port 8080)

# 运行 Vue 示例项目
cd packages/vue-template && pnpm dev       # Terminal 3 (port 5174)
cd packages/vue-playground && pnpm dev     # Terminal 4 (port 5175)
```

---

## 📝 Commit 规范 (Conventional Commits + Scope)

本仓库使用 **Conventional Commits** 并**强制要求 scope**，以支持 **per-package changelogs** (通过 Changesets 实现)。

**重要**: Commit message **必须使用英文**。

### 格式

```
<type>(<scope>)!: <subject>

[optional body]

[optional footer]
```

- **type**: `feat` | `fix` | `perf` | `refactor` | `docs` | `test` | `build` | `ci` | `chore` | `revert`
- **scope**: **必填**，使用下表中的包名或特殊 scope
- **!** / **BREAKING CHANGE:** 标记破坏性变更（触发 major 版本升级）
- **subject**: **必须使用英文**

### Scope 列表

**包相关 scope**（对应 `packages/` 下的目录名）:

- `create-dev-to` - 脚手架工具
- `react-loader` - 宿主侧加载器（React）
- `react-playground` - 示例项目（React 宿主应用）
- `react-plugin` - Vite 插件（React）
- `react-template` - 示例项目（React 组件提供方）
- `shared` - 共享协议
- `vue-loader` - 宿主侧加载器（Vue）
- `vue-playground` - 示例项目（Vue 宿主应用）
- `vue-plugin` - Vite 插件（Vue）
- `vue-template` - 示例项目（Vue 组件提供方）
- `website` - 官网

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

## 🔄 CI 驱动的发版流程

> ⚠️ **重要：本项目所有发版均通过 CI 自动化完成，严禁在本地手动运行 `pnpm changeset version` 或 `changeset publish`。**

本项目使用 [Changesets](https://github.com/changesets/changesets) 管理 npm 包版本，使用 GitHub Actions 驱动发版。所有发版都必须经过 **PR 门禁**（bot 自动创建 PR → 人工 review → merge → CI 执行实际发布）。

---

### 流程一：npm 包发版

```
开发者提交代码 + changeset 文件
    ↓  push to main
CI 检测到 .changeset/*.md 有变更
    ↓
CI 触发 release-packages.yml
    ↓  (changeset_count > 0)
changesets/action@v1 自动创建 PR
  分支: changeset-release/main
  内容: 版本 bump + CHANGELOG 更新 + changeset 文件删除
    ↓  人工 review PR，确认版本号和 changelog 正确
merge PR
    ↓  CI 检测到 changeset 文件被删除 + changeset_count == 0
CI 触发 release-packages.yml
    ↓  (changeset_count == 0)
pnpm release → 构建 + changeset publish → npm 发布 + git tag
```

**开发者操作步骤（仅两步）：**

```bash
# Step 1: 手动创建 changeset 文件（pnpm changeset 为交互式，无法在 CI 中运行）
# 文件路径: .changeset/{描述性名称}.md
cat > .changeset/fix-my-feature.md << 'EOF'
---
"@dev-to/react-plugin": patch
---

fix(react-plugin): describe what was fixed
EOF

# Step 2: 提交 changeset 文件
git add .changeset/fix-my-feature.md
git commit -m "chore(repo): add changeset for fix-my-feature"
git push
# ↑ 推送后 CI 自动创建 Release PR，等待 bot PR 出现后 review & merge
```

**⛔ 禁止操作：**
- ❌ 本地运行 `pnpm changeset version`（这会跳过 PR 门禁，直接触发 CI 发布）
- ❌ 本地运行 `changeset publish` 或 `pnpm release`
- ❌ 手动修改 `packages/*/package.json` 中的版本号（除 website 外）
- ❌ 将版本 bump commit 直接推送到 main（必须经过 PR）

---

### 流程二：website 发版

```
开发者提交 website 代码改动（packages/website/ 下的文件）
    ↓  push to main（版本号不变）
CI 检测到 packages/website/ 有变更 + 版本未变
    ↓
CI 触发 website-preview-deploy.yml
    ↓
1. 构建 website
2. 部署到 Vercel Preview 环境
3. bot 自动创建 PR:
   分支: release/website
   内容: 版本 bump (e.g. 1.5.1 → 1.5.2)
   PR body: 包含 Preview URL + changelog（自动从 git log 生成）
    ↓  开发者通过 PR 中的 Preview URL 验证效果
merge PR（版本号变更合并到 main）
    ↓  CI 检测到 packages/website/package.json 版本变更
CI 触发 website-release-deploy.yml
    ↓
构建 + 部署到 Vercel Production + 创建 GitHub Release (website-vX.Y.Z)
```

**开发者操作步骤（仅一步）：**

```bash
# 直接提交 website 代码改动，版本号不要动
git add packages/website/
git commit -m "feat(website): add new FAQ section"
git push
# ↑ 推送后 CI 自动 preview 并创建版本 bump PR，通过 Preview URL 验证后 merge
```

**⛔ 禁止操作：**
- ❌ 手动修改 `packages/website/package.json` 的版本号并直接推送（这会跳过 preview 验证步骤）
- ❌ 将 website 版本 bump 和包发版 changeset 合并在同一个 commit 中

---

### CI 触发条件速查表

| 触发条件 | CI 行为 |
|---------|---------|
| `.changeset/*.md` 有变更（新增/删除） | 触发 `release-packages.yml` |
| `changeset_count > 0` + publishable 包有改动 | 触发 `release-packages.yml` |
| `packages/website/` 有改动 + 版本未变 | 触发 **preview** deploy + 创建 website Release PR |
| `packages/website/package.json` 版本号变化 | 触发 **production** deploy |

**注意：** `release-packages.yml` 内部根据 `changeset_count` 区分两种行为：
- `changeset_count > 0` → 创建/更新 Release PR（**不发布**）
- `changeset_count == 0` → `pnpm release` 直接发布（**实际发布**，只会在 PR merge 后触发）

---

### Changeset 文件格式

```markdown
---
"@dev-to/react-plugin": patch
"@dev-to/react-loader": patch
---

fix(react-plugin): describe what was fixed

- Bullet point detail 1
- Bullet point detail 2
```

版本类型：
- **`major`**: 破坏性变更（BREAKING CHANGE），慎用
- **`minor`**: 新增功能（feat）
- **`patch`**: Bug 修复（fix）、文档、性能优化等

**不需要 changeset 的场景：** `@dev-to/website`（在 `.changeset/config.json` ignore 列表中）、`create-dev-to`（同上）、纯文档/CI 改动。

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

- **shared**: 不依赖任何内部包，保持纯净
- **react-plugin / react-loader**: 只依赖 shared
- **示例项目**: 可依赖所有核心包

### 3. 构建顺序

依赖关系决定了构建顺序，pnpm 会自动处理：

```
1. shared (无依赖 - 基础层)
2. react-plugin, react-loader, vue-plugin, vue-loader (依赖 shared)
3. create-dev-to (独立)
4. react-template, react-playground, vue-template, vue-playground (依赖 plugin/loader)
```

### 4. 发布检查

**npm 包发版前检查（开发者侧）：**
- [ ] 代码改动已提交并推送到 main
- [ ] 已创建 changeset 文件（`.changeset/*.md`）并提交
- [ ] 等待 CI bot 创建 `changeset-release/main` PR
- [ ] 在 PR 中确认版本号和 CHANGELOG 内容正确
- [ ] merge PR → 等待 CI 完成 npm 发布

**website 发版前检查（开发者侧）：**
- [ ] website 代码改动已提交并推送到 main（不改版本号）
- [ ] 等待 CI 创建 `release/website` PR
- [ ] 通过 PR 中的 Preview URL 验证功能正确
- [ ] merge PR → 等待 CI 完成生产部署

---

## 🤖 AI Agent 专用提示

### ⛔ 发版相关的绝对禁止事项

```
禁止在本地执行：
  pnpm changeset version    ← 会绕过 PR 门禁，直接触发 CI publish
  pnpm release              ← 同上
  changeset publish         ← 同上
  手动修改 package.json 版本号并 push（website 除外，由 CI bot 负责）
```

### 推荐操作流程

1. **修改代码前**: 先阅读相关包的源码
2. **提交代码时**: 严格遵守 Conventional Commits 格式
3. **需要发版时**: 手动创建 changeset 文件（见下方示例），**不要**跑 `pnpm changeset`（交互式，不适合 agent）
4. **测试构建**: 修改后运行 `pnpm build` 确保构建成功
5. **push 后等待**: CI 自动创建 Release PR，**不要**自己做版本 bump

### 常见任务示例

**添加新功能到 react-plugin（需要发版）**:
```bash
# 1. 修改代码
# 2. 构建测试
pnpm --filter @dev-to/react-plugin build

# 3. 手动创建 changeset 文件
cat > .changeset/add-feature-x.md << 'EOF'
---
"@dev-to/react-plugin": minor
---

feat(react-plugin): add feature X

- Detail about what was added
EOF

# 4. 提交（代码 + changeset 分开提交，或合并提交均可）
git add packages/react-plugin/ .changeset/add-feature-x.md
git commit -m "feat(react-plugin): add new feature X"
git push
# ↑ CI 会自动创建 Release PR，等待 PR 出现后告知用户 review & merge
```

**修复 bug（需要发版）**:
```bash
# 1. 修改代码
# 2. 创建 changeset 文件
cat > .changeset/fix-issue-y.md << 'EOF'
---
"@dev-to/react-loader": patch
---

fix(react-loader): resolve issue Y
EOF

# 3. 提交
git add . && git commit -m "fix(react-loader): resolve issue Y"
git push
```

**更新 website 内容（不涉及包发版）**:
```bash
# 无需 changeset，直接提交 website 文件
git add packages/website/
git commit -m "feat(website): add new docs section"
git push
# ↑ CI 自动 preview deploy + 创建 website release PR
```

**更新文档/CI（不需要发版）**:
```bash
# 无需 changeset
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
A: 所有会影响已发布包的变更（feat, fix, perf, refactor）都需要 changeset。文档、CI、website 等不影响包行为的变更不需要。注意 `@dev-to/website` 和 `create-dev-to` 在 `.changeset/config.json` 的 ignore 列表中，永远不需要 changeset。

**Q: 如何回滚错误的发布？**
A: 使用 `npm deprecate` 标记错误版本，然后发布新的 patch 版本修复问题。不建议删除已发布的版本。

**Q: 示例项目需要发布吗？**
A: 不需要，所有示例项目（react-template、react-playground、vue-template、vue-playground）都在 `package.json` 中设置了 `"private": true`，不会被发布，也已添加到 `.changeset/config.json` 的 ignore 列表中。
---

## 🚨 常见陷阱与解决方案

### 1. Vite 版本兼容性问题

**问题描述**:
当插件需要兼容多个 Vite 版本（如 Vite 5.x 和 7.x）时，使用 `Plugin[]` 或 `PluginOption[]` 作为返回类型会导致 TS2769 错误：
```
Type PluginOption[] is not assignable to type PluginOption
```
这是因为不同版本的 Vite 中，`PluginOption` 和 `Plugin` 类型定义不兼容。

**失败的尝试**:
1. ❌ `Plugin[]` - 仍被版本特定的 Vite 类型系统约束
2. ❌ `PluginOption[]` - 同样被版本特定约束（虽然比 Plugin[] 更灵活）
3. ❌ `unknown[]` - 编译通过但使用时仍报类型错误

**正确解决方案**:
```typescript
// eslint-disable-line @typescript-eslint/no-explicit-any
export function devToReactPlugin(
  components?: DevComponentMapInput,
  options?: DevToReactPluginOptions,
): any {
  // ...
}
```

**为什么 `any` 是必需的**：
- `any` 类型允许任何版本的 Vite 接受返回值
- 相比之下，`PluginOption` 被绑定到特定 Vite 版本的类型定义

**关键经验**：
多版本兼容的 API 设计中，"更类型安全" 不一定 = "更兼容"。优先级应该是：
1. 功能正确性 → 版本兼容性 > 类型严格性

---

### 2. ESLint 禁用注释位置

**问题描述**:
尝试使用 ESLint 禁用注释来允许 `any` 类型，但在错误的位置放置注释导致规则仍然被触发。

**失败的尝试**:
```typescript
// 这些都不起作用
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function foo(): any { }

export function foo(
): any {
  // eslint-disable-line 位置在这里不对
}
```

**正确做法**:
```typescript
// ✅ 内联注释必须在同一行的最后
export function foo(): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  // ...
}
```

**为什么**：
- ESLint 的 `// eslint-disable-line` 必须在被禁用代码所在的同一行末尾
- 返回类型 `:any` 在该行时，注释必须在该行末尾

**关键经验**：
清除 ESLint 缓存可能会有帮助：
```bash
rm -rf .cache/eslint
```

---

### 3. Pre-commit Hook 和 Lint-staged 失败

**问题描述**:
修改代码后提交时反复失败，lint-staged 运行 ESLint 检查不通过。

**解决流程**:
1. 识别问题 - 查看 ESLint 的具体错误信息
2. 修改代码 - 根据 ESLint 错误修复代码或添加禁用注释
3. 清除缓存 - `rm -rf .cache/eslint/`
4. 重新提交 - 缓存问题需要清除后重试

**常见原因**：
- ✅ 真实的代码问题（需要修改代码）
- ✅ 禁用注释位置不对（需要修改注释）
- ❌ ESLint 缓存过期（需要清除缓存）

**最佳实践**：
```bash
# 修改代码后，先手动运行检查
pnpm lint

# 如果有缓存问题
rm -rf .cache/eslint/
pnpm lint

# 确认无问题后再提交
git add .
git commit -m "..."
```

---

### 4. Changeset 文件创建

**问题描述**：
`pnpm changeset` 是交互式命令，不能在非 TTY 环境（CI、Agent）中运行。

**正确方案**：
直接手动写文件，文件名用英文短横线描述即可，不需要随机 ID：

```bash
# 创建文件 .changeset/{描述性名称}.md
cat > .changeset/fix-base-path.md << 'EOF'
---
"@dev-to/react-plugin": patch
---

fix(react-plugin): ensure paths work with any base config
EOF

# 提交
git add .changeset/fix-base-path.md
git commit -m "chore(repo): add changeset for fix-base-path"
git push
# ↑ 推送后 CI 自动创建 Release PR
```

**⚠️ 绝对不要在 changeset 提交后运行 `pnpm changeset version`**：这个命令是给 `changesets/action@v1` 在 CI 环境中用的，本地运行会直接消费 changeset 文件，导致 CI 跳过 PR 门禁直接 publish。

---

## 📋 优化建议

### 对于 AI Agents

1. **类型系统 vs 功能需求**：
   - 多版本兼容场景中，可能需要使用 `any` 来换取兼容性
   - 使用 `any` 时必须添加明确的注释说明原因

2. **构建和 Lint 流程**：
   - 修改代码后，先本地运行 `pnpm lint` 检查
   - 遇到 lint-staged 失败时，清除缓存再重试
   - 不要假设第一次提交就成功

3. **提交流程**：
   - Changeset 不能完全自动化，需要手动创建文件
   - ESLint 注释必须在正确的行位置
   - 修改后验证 `pnpm tsc --noEmit` 通过

### 对于人类开发者

- commit hook 失败时，先读完整个错误信息
- 可以临时禁用检查快速迭代：`git commit --no-verify`（但最终仍需通过）
- 维护 ESLint 配置时，注意规则与实际需求的平衡
