# 网站自动化部署与发布流程

## 概述

本项目实现了一个完整的网站自动化部署流程，分为两个阶段：

1. **Preview 阶段**：在开发分支上自动部署预览版本
2. **Production 阶段**：合并后自动部署到生产环境

## 流程架构

```
┌─────────────────────────────────────────────────────────────────┐
│ 修改 packages/website/** 并推送到 main 分支                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │ website-preview-deploy.yml  │
         └──────────┬──────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
    部署到 Vercel        分析 Git 日志
     Preview          计算新版本号
                             │
         ┌──────────┬────────┘
         │          │
         ▼          ▼
    创建/更新     提交版本更新
     Release PR   到 website-release
         │             分支
         │              │
         └──────┬───────┘
                │
                ▼
      ┌──────────────────────┐
      │ PR 等待人工审核      │
      │ 检查预览效果        │
      └─────────┬────────────┘
                │
        ┌───────▼────────┐
        │ 合并 PR 到 main │
        └───────┬────────┘
                │
                ▼
    ┌────────────────────────────────┐
    │ website-release-deploy.yml     │
    └────────┬───────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
部署到 Vercel    创建 GitHub
Production      Release Tag

    └────────┬────────┘
             │
             ▼
    🚀 网站上线
```

## 配置要求

### GitHub Secrets
在仓库 Settings → Secrets 中配置以下环境变量：

- `VERCEL_TOKEN`：Vercel API 令牌
- `VERCEL_ORG_ID`：Vercel 组织 ID
- `VERCEL_PROJECT_ID`：Vercel 项目 ID

### 分支保护规则
建议为 `website-release` 分支配置：
- 要求 Pull Request 审查
- 要求 status checks 通过

## 工作流详解

### 1. Preview 部署工作流 (`website-preview-deploy.yml`)

**触发条件**：
- `main` 分支上 `packages/website/**` 目录有变化
- 或手动触发 (`workflow_dispatch`)

**执行步骤**：

#### A. 部署到 Vercel Preview
```bash
# 1. 检出代码并安装依赖
# 2. 构建项目
pnpm build  # 在 packages/website

# 3. 部署到 Vercel preview 环境
vercel deploy --yes --token=$VERCEL_TOKEN
```

#### B. 智能版本号计算
根据自上一个发布以来的提交类型自动递增版本：

```bash
# 统计 feat 和 fix 提交
feat_count = git log 中 "feat" 的数量
fix_count = git log 中 "fix" 的数量

if feat_count > 0:
    版本升级: minor (1.0.2 → 1.1.0)
elif fix_count > 0:
    版本升级: patch (1.0.2 → 1.0.3)
else:
    版本不变
```

#### C. 创建/更新 Release PR
- 在 `website-release` 分支上
- 更新 `packages/website/package.json` 版本号
- PR 标题：`🚀 Website Release: v{version}`
- PR 内容包含：
  - 当前版本和新版本
  - 版本变更类型（patch/minor/major）
  - Preview 部署 URL
  - 变更摘要

**PR 更新策略**：
- 若已有开放的 Release PR，自动更新其内容和提交
- 若无 Release PR，自动创建新的
- 每次有新的 website 变化都会更新 PR

**示例 PR 内容**：
```markdown
## 🚀 Website Release

### 📊 版本信息
- **当前版本**: `1.0.2`
- **新版本**: `1.0.3`
- **版本类型**: `patch`

### 🔗 预览链接
- **Preview URL**: [https://dev-to-preview.vercel.app](...)
- **部署时间**: 2026-01-14
- **部署状态**: ✅ 成功

### 📝 变更摘要
- feat: add new section layout
- fix: responsive design on mobile

### ✨ 如何发布？
1. 检查预览链接中的更改
2. 如果满意，合并此 PR 到 `main`
3. 自动部署到 Vercel Production
```

### 2. Production 部署工作流 (`website-release-deploy.yml`)

**触发条件**：
- `website-release` 分支向 `main` 分支的 PR 被合并

**执行步骤**：

#### A. 部署到 Vercel Production
```bash
# 1. 检出 main 分支代码
# 2. 安装依赖
# 3. 构建项目
# 4. 部署到生产环境
vercel deploy --prod --yes --token=$VERCEL_TOKEN
```

#### B. 创建 GitHub Release
- 标签名：`website-v{version}` (e.g., `website-v1.0.3`)
- Release 名称：`Website v{version}`
- Release 内容包含生产 URL 和部署信息

## 版本管理

### 版本号格式
采用 Semantic Versioning：`MAJOR.MINOR.PATCH`

- **MAJOR**：重大功能变更，不兼容的改动
- **MINOR**：新增功能，向后兼容
- **PATCH**：bug 修复，向后兼容

### Commit 消息约定
遵循 Conventional Commits 规范：

```
feat: 新增功能      → 触发 minor 版本升级
fix: bug 修复       → 触发 patch 版本升级
docs: 文档更新      → 不升级版本
style: 代码风格     → 不升级版本
refactor: 代码重构  → 不升级版本
perf: 性能优化      → patch 版本升级
test: 测试          → 不升级版本
chore: 构建/工具    → 不升级版本
```

## 使用场景

### 场景 1：修复 Bug
```bash
# 1. 修改 packages/website 中的代码
# 2. 提交时使用 fix: 前缀
git commit -m "fix(website): correct button alignment"

# 3. 推送到 main
git push origin main

# 4. 系统自动：
#    - 部署 preview
#    - 创建 Release PR（patch 版本升级）
#    - 等待人工审核

# 5. 审核预览链接后，合并 PR
# 6. 系统自动部署到 production
```

### 场景 2：添加新功能
```bash
# 1. 修改代码
# 2. 使用 feat: 前缀提交
git commit -m "feat(website): add dark mode toggle"

# 3. 系统自动：
#    - 部署 preview（URL 在 PR 中）
#    - 创建 Release PR（minor 版本升级）

# 4. 合并后自动发布到生产
```

### 场景 3：仅更新文档
```bash
# 1. 修改网站文档
# 2. 使用 docs: 前缀提交
git commit -m "docs(website): update README"

# 3. 系统将只进行 preview 部署
# 4. 不会创建 Release PR（因为没有 feat/fix）
```

## 常见问题

### Q1：Preview URL 有效期多久？
**A**：Vercel preview 部署链接通常有效期为 7 天。建议在此期间完成审核和部署。

### Q2：如何手动触发工作流？
**A**：
1. 进入 GitHub 仓库 → Actions 选项卡
2. 选择 "Website Preview Deploy" 或 "Website Release Deploy"
3. 点击 "Run workflow"
4. 选择分支和参数

### Q3：Release PR 能否修改版本号？
**A**：可以。Release PR 中会包含版本号信息，审核时可以检查并调整。

### Q4：如何在没有人工审核的情况下自动发布？
**A**：移除 PR 的保护规则，但不推荐这样做。最佳实践是始终进行 preview 审核。

### Q5：Production 部署失败了怎么办？
**A**：
1. 检查 GitHub Actions 日志
2. 检查 Vercel 部署状态
3. 排查 Secrets 配置是否正确
4. 可以手动在 Vercel Dashboard 上重新部署

## 监控和日志

### 查看工作流日志
1. 进入 GitHub 仓库 → Actions
2. 选择具体的工作流运行
3. 查看详细的执行日志

### 关键日志位置
- **Vercel 部署日志**：workflow 中的 "Deploy to Vercel" 步骤
- **版本计算日志**：workflow 中的 "Get Current Version" 步骤
- **PR 创建日志**：workflow 中的 "Create/Update Release PR" 步骤

## 最佳实践

1. **始终进行 preview 审核**
   - 检查 preview URL 中的实际效果
   - 验证样式和交互功能

2. **遵循 Conventional Commits**
   - 使用 `feat:`、`fix:` 等前缀
   - 保证版本号自动递增的准确性

3. **及时合并 Release PR**
   - 避免多个 Release PR 同时存在
   - 及时部署避免 preview 链接失效

4. **定期检查部署状态**
   - 监控 Actions 运行状态
   - 及时发现和处理部署失败

5. **保留部署历史**
   - GitHub Release 会自动保留版本历史
   - 便于回溯和问题诊断

## 技术栈

- **CI/CD**：GitHub Actions
- **构建工具**：Vercel CLI
- **部署平台**：Vercel
- **版本管理**：Git 标签 + 语义化版本
- **脚本语言**：Bash + JavaScript (GitHub Script)

## 相关文件

- `.github/workflows/website-preview-deploy.yml` - Preview 部署工作流
- `.github/workflows/website-release-deploy.yml` - Production 部署工作流
- `packages/website/package.json` - 网站版本配置
- `scripts/website-release.mjs` - 版本计算与 PR 信息生成脚本
