import gitignore from 'eslint-config-flat-gitignore'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

export default [
  gitignore(),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  stylistic.configs.recommended,
]
