---
"create-dev-to": minor
---

Migrate templates to CSS Modules for better style isolation

- Convert App.css and component index.css to CSS Modules (.module.css)
- Update all className usage to use CSS Modules styles object
- Remove global selectors (#root, global code element) to prevent impacting host containers
- Add component-scoped styles (appCode, code classes) for complete isolation
- Improve logo spacing and hover effects
