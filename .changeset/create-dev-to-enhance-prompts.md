---
"create-dev-to": minor
---

Enhance scaffolding prompts with descriptive hints and improved UX

Add helpful hints and improved visual presentation to both project name and component name prompts:

- Add descriptive subtitles with dim/gray styling for better guidance
- Explain that project name is the directory where the project will be created
- Explain that component name can be left blank to default to project name
- Component name can be modified later in vite.config.ts
- Use full-width spaces for proper indentation of subtitle text
- Auto-configure devToReactPlugin in vite.config with the selected component name

This provides users with clear guidance during the scaffolding process and ensures the generated template is pre-configured with the correct component name.
