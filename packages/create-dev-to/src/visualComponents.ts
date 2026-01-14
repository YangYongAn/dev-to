import { yellow, red, dim, bold } from 'kolorist'

// 与 website 一致的主题色函数
// 主绿色 (#3fb950) RGB(63, 185, 80)
const primaryGreen = (str: string) => `\x1b[38;2;63;185;80m${str}\x1b[0m`

export interface InstallPhase {
  name: 'resolving' | 'downloading' | 'installing' | 'building'
  progress: number
  current?: number
  total?: number
  active: boolean
}

export interface InstallStats {
  startTime: number
  endTime: number
  duration: number
  packagesAdded: number
  packagesUpdated: number
  packagesRemoved: number
  packagesTotal: number
  downloadSpeed: number
  downloadedBytes: number
  nodeModulesSize: number
  warnings: string[]
}

interface RGB {
  r: number
  g: number
  b: number
}

const ANSI = {
  cursorUp: (n: number) => `\x1b[${n}A`,
  cursorDown: (n: number) => `\x1b[${n}B`,
  cursorTo: (x: number, y?: number) =>
    y !== undefined ? `\x1b[${y};${x}H` : `\x1b[${x}G`,
  clearLine: () => '\x1b[2K',
  clearScreen: () => '\x1b[2J',
  hideCursor: () => '\x1b[?25l',
  showCursor: () => '\x1b[?25h',
}

function trueColor(r: number, g: number, b: number, text: string): string {
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`
}

function createGradient(text: string, startColor: RGB, endColor: RGB): string {
  const chars = text.split('')
  const length = chars.length

  if (length === 0) return text
  if (length === 1) return trueColor(startColor.r, startColor.g, startColor.b, text)

  let result = ''
  for (let i = 0; i < length; i++) {
    const ratio = i / (length - 1)
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio)
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio)
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio)
    result += trueColor(r, g, b, chars[i])
  }

  return result
}

interface ProgressBarOptions {
  width: number
  progress: number
  label: string
  gradient?: boolean
  colors?: RGB[]
  showPercentage?: boolean
}

function renderProgressBar(options: ProgressBarOptions): string {
  const { width, progress, label, gradient, colors, showPercentage } = options

  const filledWidth = Math.floor((width * progress) / 100)
  const emptyWidth = width - filledWidth

  let bar = ''
  if (gradient && colors && colors.length > 0) {
    for (let i = 0; i < filledWidth; i++) {
      const ratio = filledWidth > 1 ? i / (filledWidth - 1) : 0
      const colorIndex = Math.min(
        Math.floor(ratio * (colors.length - 1)),
        colors.length - 1,
      )
      const nextColorIndex = Math.min(colorIndex + 1, colors.length - 1)
      const color = colors[colorIndex]
      const nextColor = colors[nextColorIndex]

      const localRatio
        = ratio * (colors.length - 1) - Math.floor(ratio * (colors.length - 1))
      const r = Math.round(color.r + (nextColor.r - color.r) * localRatio)
      const g = Math.round(color.g + (nextColor.g - color.g) * localRatio)
      const b = Math.round(color.b + (nextColor.b - color.b) * localRatio)

      bar += trueColor(r, g, b, '▓')
    }
  }
  else {
    bar = '▓'.repeat(filledWidth)
  }

  bar += dim('░'.repeat(emptyWidth))

  const percentage = showPercentage ? ` ${Math.round(progress)}%` : ''
  return `${bar} ${label}${percentage}`
}

function getPhaseIcon(phase: string): string {
  const icons: Record<string, string> = {
    resolving: '🔍',
    downloading: '⬇️',
    installing: '📦',
    building: '🔨',
  }
  return icons[phase] || '●'
}

function getPhaseColors(phase: string): RGB[] {
  // 使用与 website 一致的主题色
  // 主绿色 (#3fb950) RGB(63, 185, 80)
  // 浅绿色 (#56d364) RGB(86, 211, 100)
  const colorSets: Record<string, RGB[]> = {
    resolving: [
      { r: 63, g: 185, b: 80 },
      { r: 86, g: 211, b: 100 },
    ],
    downloading: [
      { r: 63, g: 185, b: 80 },
      { r: 86, g: 211, b: 100 },
    ],
    installing: [
      { r: 63, g: 185, b: 80 },
      { r: 86, g: 211, b: 100 },
    ],
    building: [
      { r: 63, g: 185, b: 80 },
      { r: 86, g: 211, b: 100 },
    ],
  }
  return colorSets[phase] || [{ r: 63, g: 185, b: 80 }]
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`
  if (bytesPerSecond < 1024 * 1024)
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDuration(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

function detectColorSupport(): boolean {
  if (process.env.NO_COLOR || process.env.TERM === 'dumb') {
    return false
  }
  return true
}

export class InstallRenderer {
  private isTTY: boolean
  private supportsColor: boolean
  private lineCount: number = 0

  constructor() {
    this.isTTY = process.stdout.isTTY ?? false
    this.supportsColor = detectColorSupport()
  }

  render(phases: InstallPhase[], stats: Partial<InstallStats>): void {
    if (!this.isTTY) {
      this.renderSimple(phases)
      return
    }

    const lines = this.buildEnhancedUI(phases, stats)
    this.updateTerminal(lines)
  }

  private buildEnhancedUI(
    phases: InstallPhase[],
    stats: Partial<InstallStats>,
  ): string[] {
    const lines: string[] = []

    lines.push('')
    if (this.supportsColor) {
      const title = createGradient(
        '◆ Installing Dependencies',
        { r: 63, g: 185, b: 80 },
        { r: 86, g: 211, b: 100 },
      )
      lines.push(bold(title))
    }
    else {
      lines.push(bold('◆ Installing Dependencies'))
    }
    lines.push('')

    phases.forEach((phase) => {
      const icon = getPhaseIcon(phase.name)
      const bar = renderProgressBar({
        width: 40,
        progress: phase.progress,
        label: this.getPhaseLabel(phase.name),
        gradient: this.supportsColor,
        colors: getPhaseColors(phase.name),
        showPercentage: true,
      })
      lines.push(`${icon} ${bar}`)
    })

    lines.push('')

    const statsLine = this.buildStatsLine(stats)
    if (statsLine) {
      lines.push(dim(statsLine))
      lines.push('')
    }

    return lines
  }

  private getPhaseLabel(phase: string): string {
    const labels: Record<string, string> = {
      resolving: 'Resolving packages  ',
      downloading: 'Downloading        ',
      installing: 'Installing         ',
      building: 'Building           ',
    }
    return labels[phase] || phase
  }

  private buildStatsLine(stats: Partial<InstallStats>): string {
    const parts: string[] = []

    if (stats.packagesAdded) {
      parts.push(`Packages: ${primaryGreen(`+${stats.packagesAdded}`)}`)
    }
    if (stats.packagesUpdated) {
      parts.push(`Updated: ${yellow(stats.packagesUpdated.toString())}`)
    }
    if (stats.packagesRemoved) {
      parts.push(`Removed: ${red(stats.packagesRemoved.toString())}`)
    }

    if (stats.startTime) {
      const duration = performance.now() - stats.startTime
      parts.push(`Time: ${formatDuration(duration)}`)
    }

    if (stats.downloadSpeed && stats.downloadSpeed > 0) {
      parts.push(`Speed: ${formatSpeed(stats.downloadSpeed)}`)
    }

    return parts.join('  ')
  }

  private updateTerminal(lines: string[]): void {
    if (this.lineCount > 0) {
      for (let i = 0; i < this.lineCount; i++) {
        process.stdout.write(ANSI.cursorUp(1) + ANSI.clearLine())
      }
    }

    lines.forEach(line => process.stdout.write(line + '\n'))
    this.lineCount = lines.length
  }

  private renderSimple(phases: InstallPhase[]): void {
    const activePhase = phases.find(p => p.active)
    if (activePhase) {
      const label = this.getPhaseLabel(activePhase.name).trim()
      console.log(
        `[${label.toUpperCase()}] ${Math.round(activePhase.progress)}%`,
      )
    }
  }

  clear(): void {
    if (this.isTTY && this.lineCount > 0) {
      for (let i = 0; i < this.lineCount; i++) {
        process.stdout.write(ANSI.cursorUp(1) + ANSI.clearLine())
      }
      this.lineCount = 0
    }
  }
}

export function displayInstallSummary(stats: InstallStats): void {
  const lines: string[] = []

  lines.push('')
  lines.push(primaryGreen('✨ Installation Complete!'))
  lines.push('')

  const pkgStats: string[] = []
  if (stats.packagesAdded > 0)
    pkgStats.push(`${primaryGreen(`+${stats.packagesAdded}`)} added`)
  if (stats.packagesUpdated > 0)
    pkgStats.push(`${yellow(`~${stats.packagesUpdated}`)} updated`)
  if (stats.packagesRemoved > 0)
    pkgStats.push(`${red(`-${stats.packagesRemoved}`)} removed`)

  if (pkgStats.length > 0) {
    lines.push(`  ${bold('Packages:')} ${pkgStats.join(', ')}`)
  }

  lines.push(`  ${bold('Duration:')} ${formatDuration(stats.duration)}`)
  if (stats.downloadSpeed > 0) {
    lines.push(`  ${bold('Avg Speed:')} ${formatSpeed(stats.downloadSpeed)}`)
  }

  if (stats.nodeModulesSize > 0) {
    lines.push(`  ${bold('Disk Usage:')} ${formatSize(stats.nodeModulesSize)}`)
  }

  if (stats.warnings.length > 0) {
    lines.push('')
    lines.push(yellow(`  ⚠️  ${stats.warnings.length} warning(s)`))
  }

  lines.push('')

  lines.forEach(line => console.log(line))
}
