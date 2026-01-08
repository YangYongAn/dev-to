---
"@dev-to/create-react": patch
---

# Use Git Clone for Gitee Fallback Support

Replaced degit with native `git clone` for Gitee fallback, as degit does not support Gitee.

**Problem:** Degit only supports GitHub, GitLab, Sourcehut, and BitBucket. When attempting
to use degit with Gitee URLs, it throws `DegitError: degit supports GitHub, GitLab, Sourcehut and BitBucket`.

**Solution:** Implement dual clone strategies:
- **GitHub (Primary):** Continue using degit via the user's preferred package manager
- **Gitee (Fallback):** Use native `git clone --depth 1` for efficient cloning

The implementation extracts the template folder from the cloned repo structure,
handling the different directory layouts between GitHub and Gitee mirrors.
