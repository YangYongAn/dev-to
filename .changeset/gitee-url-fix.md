---
"@dev-to/create-react": patch
---

# Fix Gitee URL Format for Degit Compatibility

Fixed the Gitee mirror URL to use complete HTTPS format instead of short owner/repo format.

Degit defaults to GitHub when given short repository paths (e.g., `owner/repo`).
To properly route to Gitee, the complete URL including the host is required:
`https://gitee.com/mirrors/ViteJS/packages/create-vite/template-{template}`

This fix ensures that when GitHub is unavailable, the fallback to Gitee mirrors
works correctly and users can successfully scaffold projects in network-restricted regions.
