# 发布流程

本项目包含两种类型的发布：npm 包发布和 website 发布。

## 📦 NPM 包发布

使用 [Changesets](https://github.com/changesets/changesets) 管理版本和发布。

### 流程

1. **开发变更**
   ```bash
   # 修改代码
   git add .
   git commit -m "feat: add new feature"
   ```

2. **添加 changeset**
   ```bash
   pnpm changeset
   # 选择要发布的包
   # 选择版本升级类型 (major/minor/patch)
   # 填写变更说明
   ```

3. **提交并推送**
   ```bash
   git add .
   git commit -m "chore: add changeset"
   git push
   ```

4. **自动化处理**
   - CI 检测到 changeset 文件变更
   - 自动创建 "Version Packages" PR
   - 合并 PR 后自动发布到 npm

### 可发布的包

- `@dev-to/shared`
- `@dev-to/react-plugin`
- `@dev-to/react-loader`
- `@dev-to/vue-plugin`
- `@dev-to/vue-loader`
- `create-dev-to`

---

## 🌐 Website 发布

Website 使用**基于版本号的发布流程**，类似 changeset 但更简单。

### Preview（预览）部署

**触发条件：** 修改 `packages/website/` 下的文件（除了 package.json 版本号）

```bash
# 修改 website 代码
vim packages/website/index.html
git add .
git commit -m "feat(website): add new section"
git push
```

**自动行为：**
- ✅ 部署到 Vercel Preview
- 📝 在 GitHub Actions Summary 显示 Preview URL

### Production（生产）部署

**触发条件：** 修改 `packages/website/package.json` 的 `version` 字段

```bash
# 1. 手动修改版本号
vim packages/website/package.json
# 将 "version": "1.3.1" 改为 "version": "1.4.0"

# 2. 提交并推送
git add packages/website/package.json
git commit -m "chore(website): release v1.4.0"
git push
```

**自动行为：**
- ✅ 部署到 Vercel Production
- 🏷️ 创建 Git Tag `website-v1.4.0`
- 📦 创建 GitHub Release
- 📝 自动提取 changelog

### 版本号规则

遵循 [Semantic Versioning](https://semver.org/)：

- **Major (x.0.0)** - 破坏性变更
- **Minor (x.x.0)** - 新增功能（向后兼容）
- **Patch (x.x.x)** - Bug 修复（向后兼容）

### 示例工作流

```bash
# 日常开发 - 自动部署 Preview
git commit -m "feat(website): add FAQ section"
git push
# → Preview 自动部署

git commit -m "fix(website): correct typo"
git push
# → Preview 自动部署

git commit -m "docs(website): update README"
git push
# → Preview 自动部署

# 准备发布 - 升级版本并部署 Production
# 分析累积的 commits，决定版本升级类型
# 有 feat → minor (1.3.1 → 1.4.0)
# 只有 fix → patch (1.3.1 → 1.3.2)
# 有 BREAKING CHANGE → major (1.3.1 → 2.0.0)

vim packages/website/package.json  # 修改版本号
git commit -m "chore(website): release v1.4.0"
git push
# → Production 自动部署
```

---

## 🚀 手动触发

所有 workflow 都支持在 GitHub Actions 页面手动触发：

1. 访问 https://github.com/YOUR_USERNAME/dev-to/actions
2. 选择对应的 workflow
3. 点击 "Run workflow"

---

## 📊 CI 流程图

```
代码变更 → CI
         │
         ├─→ lint ✓
         ├─→ build ✓
         │
         └─→ dispatch (智能路由)
                 │
                 ├─→ 检测到 changeset → release-packages
                 ├─→ 检测到 website 代码变更 → preview
                 └─→ 检测到 website 版本变更 → production
```
