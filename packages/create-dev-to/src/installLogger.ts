import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import type { InstallPhase, InstallStats } from './visualComponents.js'
import { InstallRenderer } from './visualComponents.js'
import { createParser, type ParsedOutput } from './outputParsers.js'

type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'

export class InstallLogger {
  private packageManager: PackageManager
  private parser: ReturnType<typeof createParser>
  private renderer: InstallRenderer
  private stats: Partial<InstallStats>
  private phases: InstallPhase[]
  private renderScheduled: boolean = false
  private lastRenderTime: number = 0
  private readonly RENDER_INTERVAL = 100

  constructor(packageManager: PackageManager) {
    this.packageManager = packageManager
    this.parser = createParser(packageManager)
    this.renderer = new InstallRenderer()
    this.stats = {
      packagesAdded: 0,
      packagesUpdated: 0,
      packagesRemoved: 0,
      packagesTotal: 0,
      downloadSpeed: 0,
      downloadedBytes: 0,
      nodeModulesSize: 0,
      warnings: [],
    }
    this.phases = [
      { name: 'resolving', progress: 0, active: true },
      { name: 'downloading', progress: 0, active: false },
      { name: 'installing', progress: 0, active: false },
    ]
  }

  start(): void {
    this.stats.startTime = performance.now()
    this.render()
  }

  processLine(line: string, stream: 'stdout' | 'stderr'): void {
    if (!line || line.trim() === '') return

    try {
      const parsed = this.parser.parse(line, stream)
      this.handleParsedOutput(parsed)
      this.scheduleRender()
    }
    catch (error) {
      if (process.env.DEBUG) {
        console.error('Parse error:', error)
      }
    }
  }

  async finish(projectDir: string): Promise<InstallStats> {
    this.stats.endTime = performance.now()
    this.stats.duration = this.stats.endTime - (this.stats.startTime || 0)

    this.updatePhase('installing', 100)
    this.render()

    this.renderer.clear()

    try {
      this.stats.nodeModulesSize = await this.calculateNodeModulesSize(
        projectDir,
      )
    }
    catch {
      this.stats.nodeModulesSize = 0
    }

    return this.stats as InstallStats
  }

  error(): void {
    this.renderer.clear()
  }

  private handleParsedOutput(parsed: ParsedOutput): void {
    switch (parsed.type) {
      case 'phase_change':
        if (parsed.phase) {
          this.activatePhase(parsed.phase)
        }
        break

      case 'progress':
        if (parsed.phase && parsed.progress !== undefined) {
          this.updatePhase(parsed.phase, parsed.progress)
        }
        break

      case 'package_info':
        if (parsed.packageCount !== undefined) {
          this.stats.packagesAdded = parsed.packageCount
        }
        break

      case 'warning':
        if (parsed.message) {
          this.stats.warnings = this.stats.warnings || []
          this.stats.warnings.push(parsed.message)
        }
        break

      case 'error':
        break

      case 'ignore':
        break
    }
  }

  private activatePhase(phaseName: string): void {
    const phase = this.phases.find(p => p.name === phaseName)
    if (phase) {
      this.phases.forEach(p => (p.active = false))
      phase.active = true

      if (phaseName === 'resolving' && phase.progress === 0) {
        phase.progress = 10
      }
      else if (phaseName === 'downloading' && phase.progress === 0) {
        const resolvingPhase = this.phases.find(p => p.name === 'resolving')
        if (resolvingPhase) resolvingPhase.progress = 100
        phase.progress = 10
      }
      else if (phaseName === 'installing' && phase.progress === 0) {
        const downloadingPhase = this.phases.find(
          p => p.name === 'downloading',
        )
        if (downloadingPhase) downloadingPhase.progress = 100
        phase.progress = 10
      }
    }
  }

  private updatePhase(phaseName: string, progress: number): void {
    const phase = this.phases.find(p => p.name === phaseName)
    if (phase) {
      phase.progress = Math.max(phase.progress, Math.min(100, progress))
      phase.active = true

      if (progress >= 100) {
        const phaseIndex = this.phases.findIndex(p => p.name === phaseName)
        if (phaseIndex < this.phases.length - 1) {
          this.phases[phaseIndex + 1].active = true
          phase.active = false
        }
      }
    }
  }

  private scheduleRender(): void {
    if (this.renderScheduled) return

    const now = performance.now()
    const timeSinceLastRender = now - this.lastRenderTime

    if (timeSinceLastRender >= this.RENDER_INTERVAL) {
      this.render()
      this.lastRenderTime = now
    }
    else {
      this.renderScheduled = true
      setTimeout(() => {
        this.render()
        this.renderScheduled = false
        this.lastRenderTime = performance.now()
      }, this.RENDER_INTERVAL - timeSinceLastRender)
    }
  }

  private render(): void {
    try {
      this.renderer.render(this.phases, this.stats)
    }
    catch (error) {
      if (process.env.DEBUG) {
        console.error('Render error:', error)
      }
    }
  }

  private async calculateNodeModulesSize(projectDir: string): Promise<number> {
    const nodeModulesPath = path.join(projectDir, 'node_modules')

    if (!fs.existsSync(nodeModulesPath)) {
      return 0
    }

    if (process.platform !== 'win32') {
      try {
        const result = execSync(`du -sk "${nodeModulesPath}"`, {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
        const sizeKB = parseInt(result.split('\t')[0])
        return sizeKB * 1024
      }
      catch {
        // Fall through to recursive method
      }
    }

    return this.getDirectorySize(nodeModulesPath)
  }

  private getDirectorySize(dir: string): number {
    let size = 0

    try {
      const files = fs.readdirSync(dir, { withFileTypes: true })

      for (const file of files) {
        const filePath = path.join(dir, file.name)

        try {
          if (file.isDirectory()) {
            size += this.getDirectorySize(filePath)
          }
          else {
            const stats = fs.statSync(filePath)
            size += stats.size
          }
        }
        catch {
          // Skip files we can't access
          continue
        }
      }
    }
    catch {
      // Skip directories we can't access
    }

    return size
  }
}
