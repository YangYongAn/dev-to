import process from 'node:process'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const args = new Set(process.argv.slice(2))
const outputIndex = process.argv.indexOf('--output')
const outputPath = outputIndex === -1 ? null : process.argv[outputIndex + 1]
const shouldWrite = args.has('--write')

const pkgPath = path.resolve('packages/website/package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const currentVersion = pkg.version || '0.0.0'

const lastTag = safeExec('git tag --list \'website-v*\' --sort=-v:refname | head -n 1')
const range = lastTag ? `${lastTag}..HEAD` : 'HEAD'
const logRaw = safeExec(
  `git log ${range} --pretty=format:%s%x1f%b%x1e -- packages/website`,
)

const entries = logRaw
  .split('\x1e')
  .map((record) => {
    const [subject, body] = record.split('\x1f')
    return {
      subject: (subject || '').trim(),
      body: (body || '').trim(),
    }
  })
  .filter(entry => entry.subject.length > 0)

const bumpType = determineBumpType(entries)
const shouldRelease = bumpType !== 'none'
const nextVersion = shouldRelease ? bumpVersion(currentVersion, bumpType) : currentVersion

if (shouldWrite && shouldRelease) {
  pkg.version = nextVersion
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

const changeLog = entries.map(entry => `- ${entry.subject}`).join('\n')

writeOutputs({
  should_release: shouldRelease ? 'true' : 'false',
  bump_type: bumpType,
  current_version: currentVersion,
  next_version: nextVersion,
  last_tag: lastTag,
  range,
  change_log: changeLog,
})

function safeExec(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim()
  }
  catch {
    return ''
  }
}

function determineBumpType(entries) {
  let hasMajor = false
  let hasMinor = false
  let hasPatch = false

  for (const entry of entries) {
    const subject = entry.subject
    const body = entry.body

    if (/^[a-z]+(\(.+\))?!:/.test(subject) || /BREAKING CHANGE:/.test(body)) {
      hasMajor = true
      break
    }

    if (/^feat(\(.+\))?:/.test(subject)) {
      hasMinor = true
      continue
    }

    if (/^(fix|perf)(\(.+\))?:/.test(subject)) {
      hasPatch = true
    }
  }

  if (hasMajor)
    return 'major'
  if (hasMinor)
    return 'minor'
  if (hasPatch)
    return 'patch'
  return 'none'
}

function bumpVersion(version, bump) {
  const [majorRaw, minorRaw, patchRaw] = version.split('.')
  const major = Number(majorRaw) || 0
  const minor = Number(minorRaw) || 0
  const patch = Number(patchRaw) || 0

  if (bump === 'major')
    return `${major + 1}.0.0`
  if (bump === 'minor')
    return `${major}.${minor + 1}.0`
  if (bump === 'patch')
    return `${major}.${minor}.${patch + 1}`
  return version
}

function writeOutputs(outputs) {
  if (!outputPath) {
    process.stdout.write(`${JSON.stringify(outputs, null, 2)}\n`)
    return
  }

  const delimiter = 'OUTPUT_DELIM'
  const lines = Object.entries(outputs).map(([key, value]) => (
    `${key}<<${delimiter}\n${value}\n${delimiter}`
  ))

  fs.appendFileSync(outputPath, `${lines.join('\n')}\n`)
}
