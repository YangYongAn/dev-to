---
"@dev-to/website": patch
---

fix(website): prioritize Vercel environment variables for git info

- Add support for VERCEL_GIT_COMMIT_SHA and VERCEL_GIT_COMMIT_REF
- Fix version display showing "unknown@unknown" on Vercel deployments
- Prioritize Vercel env vars over GitHub Actions and git commands
