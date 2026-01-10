---
'create-dev-to': minor
---

Add template caching with commit hash validation and improve user experience

- **Template Caching**: Cache downloaded templates in `~/.create-dev-to-cache` for faster subsequent project creation
- **Smart Cache Validation**: Check specific template directory commit hash instead of entire repo HEAD for accurate cache invalidation
- **Cache Status Visualization**: Display cache status and commit hash in scaffolding messages:
  - "Project created with cached template (abc12345)" when using cache
  - "Project created (abc12345)" when downloading fresh
- **Plugin Configuration**: Use string shorthand `devToReactPlugin('ComponentName')` for default component names, object form for custom names
