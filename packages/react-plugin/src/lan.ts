import os from 'node:os'

export function getLanIPv4Hosts(): string[] {
  const nets = os.networkInterfaces()
  const out = new Set<string>()

  for (const items of Object.values(nets)) {
    if (!items) continue
    for (const info of items) {
      if (info.family === 'IPv4' && !info.internal) {
        out.add(info.address)
      }
    }
  }

  return Array.from(out)
}
