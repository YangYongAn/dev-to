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
  parse(line: string, stream: 'stdout' | 'stderr'): ParsedOutput {
    // Detect resolving phase
    if (line.includes('Resolving:') || line.includes('Resolving dependencies')) {
      return { type: 'phase_change', phase: 'resolving' }
    }

    // Parse progress line: "Progress: resolved 245, reused 180, downloaded 65, added 0"
    const progressMatch = line.match(
      /Progress: resolved (\d+)(?:, reused (\d+))?(?:, downloaded (\d+))?(?:, added (\d+))?/,
    )
    if (progressMatch) {
      const resolved = parseInt(progressMatch[1])
      const added = parseInt(progressMatch[4] || '0')

      if (added > 0) {
        return {
          type: 'progress',
          phase: 'installing',
          packageCount: added,
          progress: Math.min(100, 70 + (added / Math.max(resolved, 1)) * 30),
        }
      }
      else {
        return {
          type: 'progress',
          phase: 'resolving',
          progress: Math.min(100, (resolved / Math.max(resolved, 100)) * 30),
        }
      }
    }

    // Detect downloading phase
    if (line.includes('Downloading') || line.includes('downloading')) {
      return { type: 'phase_change', phase: 'downloading' }
    }

    // Parse package info: "Packages: +245" or "Packages: +245 ~5 -2"
    const packagesMatch = line.match(
      /Packages:\s*([+\-~]?\d+)?(?:\s+([+\-~]\d+))?(?:\s+([+\-~]\d+))?/,
    )
    if (packagesMatch && packagesMatch[1]) {
      return {
        type: 'package_info',
        packageCount: parseInt(packagesMatch[1]),
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
  parse(line: string, stream: 'stdout' | 'stderr'): ParsedOutput {
    // Parse completion line: "added 245 packages, and audited 246 packages in 10s"
    const completionMatch = line.match(
      /added (\d+) packages?(?:, (?:and|)?(?:audited|updated) (\d+) packages)?/,
    )
    if (completionMatch) {
      return {
        type: 'package_info',
        packageCount: parseInt(completionMatch[1]),
        progress: 100,
        phase: 'installing',
      }
    }

    // Parse up to date: "up to date, audited 245 packages in 0.5s"
    if (line.includes('up to date')) {
      return {
        type: 'package_info',
        packageCount: 0,
        progress: 100,
        phase: 'installing',
      }
    }

    // Detect phases
    if (line.includes('up to date') || line.includes('added')) {
      return { type: 'phase_change', phase: 'installing' }
    }

    // Parse npm output with progress (some versions show this)
    const progressMatch = line.match(/\|(.+?)\|/)
    if (progressMatch) {
      const progress = (progressMatch[1].length / 50) * 100
      return {
        type: 'progress',
        progress: Math.min(100, progress),
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
        type: 'package_info',
        packageCount: parseInt(completionMatch[1]),
        progress: 100,
        phase: 'installing',
      }
    }

    // Parse already installed: "0 packages installed"
    const alreadyMatch = line.match(/^\s*(\d+)\s+packages already installed/)
    if (alreadyMatch) {
      return {
        type: 'package_info',
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
