---
"create-dev-to": patch
---

修复安装进度显示问题

## 🐛 Bug 修复

- **修复 spinner 输出格式**: 在 git clone 输出前停止 spinner，防止日志连在一起
  - 现在 git clone 的输出会在新的一行开始
  - 避免 "Trying Gitee Mirror..." 和 git 输出混在同一行

## ✨ 改进

- **平滑进度更新**: 添加自动进度增量功能
  - 刷新间隔优化至 50ms，提升响应速度
  - 即使没有新日志输出，每 200ms 也会自动增加进度
  - 使用递减增量算法，模拟真实安装过程

- **改进阶段管理**: 优化 resolving/downloading/installing 三阶段转换
  - 当进入新阶段时，自动将前面的阶段标记为 100% 完成
  - 更准确的 pnpm 进度解析，基于 resolved/reused/downloaded/added 数值
  - 确保最终所有阶段都显示 100% 完成

## 📊 进度条体验提升

之前：
- 进度条更新卡顿，可能 1 秒才更新一次
- 直接从 0% 跳到 100%
- 最终快照显示 Resolving 87%, Downloading 99%, Installing 100%

现在：
- 流畅的进度更新，不会卡顿
- 渐进式增长，不会突然跳跃
- 最终快照显示所有阶段都是 100%
