export interface ParsedOutput {
  type: 'phase_change' | 'progress' | 'package_info' | 'warning' | 'error' | 'ignore'
  phase?: string
  progress?: number
  packageCount?: number
  downloadedBytes?: number
  message?: string
}

export abstract class OutputParser {
  abstract parse(line: string, stream: 'stdout' | 'stderr'): ParsedOutput
}

export class PnpmParser extends OutputParser {
  private totalPackages: number = 0
  private maxResolved: number = 0
  private lastPhase: string = 'resolving'

  parse(line: string, stream: 'stdout' | 'stderr'): ParsedOutput {
    // Detect resolving phase start
    if (line.includes('Lockfile is up to date') || line.includes('Already up to date')) {
      return {
        type: 'progress',
        phase: 'installing',
        progress: 100,
        packageCount: 0,
      }
    }

    // Parse progress line: "Progress: resolved 245, reused 180, downloaded 65, added 0"
    const progressMatch = line.match(
      /Progress: resolved (\d+)(?:, reused (\d+))?(?:, downloaded (\d+))?(?:, added (\d+))?/,
    )
    if (progressMatch) {
      const resolved = parseInt(progressMatch[1])
      const reused = parseInt(progressMatch[2] || '0')
      const downloaded = parseInt(progressMatch[3] || '0')
      const added = parseInt(progressMatch[4] || '0')

      // Track max resolved as estimated total
      this.maxResolved = Math.max(this.maxResolved, resolved)

      // Determine phase and progress based on the numbers
      // When added === resolved, installation is complete
      if (added > 0 && added >= resolved) {
        this.lastPhase = 'installing'
        return {
          type: 'progress',
          phase: 'installing',
          packageCount: added,
          progress: 100,
        }
      }
      // When we have added > 0 but not all, we're installing
      else if (added > 0) {
        this.lastPhase = 'installing'
        const installProgress = Math.min(99, Math.max(10, (added / resolved) * 100))
        return {
          type: 'progress',
          phase: 'installing',
          progress: installProgress,
        }
      }
      // When downloaded > 0, we're in downloading phase
      else if (downloaded > 0 || reused > 0) {
        const total = downloaded + reused
        if (this.lastPhase !== 'downloading') {
          this.lastPhase = 'downloading'
        }
        const downloadProgress = Math.min(99, Math.max(10, (total / resolved) * 100))
        return {
          type: 'progress',
          phase: 'downloading',
          progress: downloadProgress,
        }
      }
      // Otherwise, we're still resolving
      else if (resolved > 0) {
        if (this.lastPhase !== 'resolving') {
          this.lastPhase = 'resolving'
        }
        // Use a dynamic progress that gradually increases
        const resolveProgress = Math.min(95, Math.max(10, (resolved / Math.max(this.maxResolved, 200)) * 100))
        return {
          type: 'progress',
          phase: 'resolving',
          progress: resolveProgress,
        }
      }
    }

    // Parse package info from summary: "Packages: +245"
    const packagesMatch = line.match(/Packages:\s*\+(\d+)/)
    if (packagesMatch) {
      const count = parseInt(packagesMatch[1])
      this.totalPackages = count
      return {
        type: 'package_info',
        packageCount: count,
      }
    }

    // Detect warnings
    if (line.includes('warn') && stream === 'stderr') {
      return {
        type: 'warning',
        message: line,
      }
    }

    // Detect errors
    if ((line.includes('error') || line.includes('Error')) && stream === 'stderr') {
      return {
        type: 'error',
        message: line,
      }
    }

    return { type: 'ignore' }
  }
}

export class NpmParser extends OutputParser {
  private isInstalling: boolean = false

  parse(line: string, stream: 'stdout' | 'stderr'): ParsedOutput {
    // Parse completion line: "added 245 packages, and audited 246 packages in 10s"
    const completionMatch = line.match(
      /added (\d+) packages?(?:, (?:and|)?(?:audited|updated) (\d+) packages)?/,
    )
    if (completionMatch) {
      this.isInstalling = true
      return {
        type: 'progress',
        packageCount: parseInt(completionMatch[1]),
        progress: 100,
        phase: 'installing',
      }
    }

    // Parse up to date: "up to date, audited 245 packages in 0.5s"
    if (line.includes('up to date')) {
      this.isInstalling = true
      return {
        type: 'progress',
        packageCount: 0,
        progress: 100,
        phase: 'installing',
      }
    }

    // Parse npm output with progress (some versions show this)
    const progressMatch = line.match(/\|(.+?)\|/)
    if (progressMatch) {
      const progress = (progressMatch[1].length / 50) * 100
      return {
        type: 'progress',
        progress: Math.min(95, Math.max(1, progress)),
        phase: 'downloading',
      }
    }

    // Detect vulnerabilities warnings
    if (line.includes('vulnerabilities') || line.includes('vulnerability')) {
      return {
        type: 'warning',
        message: line,
      }
    }

    // Detect errors
    if (
      line.includes('ERR!')
      || (line.includes('error') && stream === 'stderr')
    ) {
      return {
        type: 'error',
        message: line,
      }
    }

    return { type: 'ignore' }
  }
}

export class YarnParser extends OutputParser {
  parse(line: string, stream: 'stdout' | 'stderr'): ParsedOutput {
    // Parse phase indicators: "[1/4] Resolving packages..."
    const phaseMatch = line.match(/\[(\d+)\/4\]\s+(.+?)\.{3}/)
    if (phaseMatch) {
      const stepNum = parseInt(phaseMatch[1])
      const phaseNames = [
        'resolving',
        'fetching',
        'linking',
        'building',
      ]
      const phase = phaseNames[stepNum - 1] || 'resolving'

      // Map fetching to downloading
      const mappedPhase = phase === 'fetching' ? 'downloading' : phase

      return {
        type: 'phase_change',
        phase: mappedPhase,
      }
    }

    // Parse success line: "Done in 8.50s"
    const successMatch = line.match(/Done in ([\d.]+)s/)
    if (successMatch) {
      return {
        type: 'progress',
        progress: 100,
        phase: 'installing',
      }
    }

    // Parse package added/removed: "Yarn added 245 packages"
    const addedMatch = line.match(/(?:Yarn )?added (\d+) packages?/)
    if (addedMatch) {
      return {
        type: 'package_info',
        packageCount: parseInt(addedMatch[1]),
      }
    }

    // Detect warnings
    if (line.includes('warning') && stream === 'stderr') {
      return {
        type: 'warning',
        message: line,
      }
    }

    // Detect errors
    if (line.includes('error') && stream === 'stderr') {
      return {
        type: 'error',
        message: line,
      }
    }

    return { type: 'ignore' }
  }
}

export class BunParser extends OutputParser {
  parse(line: string, stream: 'stdout' | 'stderr'): ParsedOutput {
    // Parse completion: "+ 245 packages installed [1.23s]"
    const completionMatch = line.match(/^\s*\+\s*(\d+)\s+packages installed\s*\[([\d.]+)s\]/)
    if (completionMatch) {
      return {
        type: 'progress',
        packageCount: parseInt(completionMatch[1]),
        progress: 100,
        phase: 'installing',
      }
    }

    // Parse already installed: "0 packages installed"
    const alreadyMatch = line.match(/^\s*(\d+)\s+packages already installed/)
    if (alreadyMatch) {
      return {
        type: 'progress',
        packageCount: 0,
        progress: 100,
        phase: 'installing',
      }
    }

    // Detect download progress (bun shows detailed output)
    if (line.includes('Downloading') || line.includes('downloading')) {
      return { type: 'phase_change', phase: 'downloading' }
    }

    // Detect errors
    if (
      line.includes('error')
      || line.includes('Error')
      || (line.includes('failed') && stream === 'stderr')
    ) {
      return {
        type: 'error',
        message: line,
      }
    }

    return { type: 'ignore' }
  }
}

export function createParser(pm: 'pnpm' | 'npm' | 'yarn' | 'bun'): OutputParser {
  switch (pm) {
    case 'pnpm':
      return new PnpmParser()
    case 'npm':
      return new NpmParser()
    case 'yarn':
      return new YarnParser()
    case 'bun':
      return new BunParser()
    default:
      return new NpmParser() // fallback
  }
}
