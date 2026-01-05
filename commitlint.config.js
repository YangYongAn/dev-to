import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getPackageScopes() {
  const packagesDir = path.join(__dirname, 'packages')
  if (!fs.existsSync(packagesDir)) return []

  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter((dirName) => {
      const pkgJson = path.join(packagesDir, dirName, 'package.json')
      return fs.existsSync(pkgJson)
    })
    .sort()
}

const packageScopes = getPackageScopes()
const extraScopes = ['repo', 'deps', 'ci']

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
    'scope-enum': [2, 'always', [...packageScopes, ...extraScopes]],
  },
}
