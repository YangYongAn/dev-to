---
"@dev-to/react-plugin": patch
"@dev-to/create-react": patch
---

fix: add colored URL output in terminal

- Use picocolors to highlight debug panel URLs in cyan, matching Vite's output style
- Remove dev server spinner to prevent output interference
