---
---

Optimize GitHub Actions release workflow with better caching and output

**Performance Improvements:**
- Added pnpm store directory caching based on pnpm-lock.yaml hash
- Configured full git history fetch (fetch-depth: 0) for accurate changeset detection
- Both optimizations significantly reduce workflow execution time

**Better Visibility:**
- Added output step to display published packages and versions after successful release
- Helps track what was published directly from workflow logs

These improvements make the CI/CD pipeline faster and provide better feedback during the release process.
