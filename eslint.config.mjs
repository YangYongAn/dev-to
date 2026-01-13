import gitignore from 'eslint-config-flat-gitignore'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import globals from 'globals'

export default [
  gitignore(),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  stylistic.configs.recommended,
  {
    files: ['packages/website/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
]
