export type TabKey = 'state' | 'async' | 'styles' | 'assets' | 'svg'

export type TabItem = {
  key: TabKey
  label: string
}

export const tabs: TabItem[] = [
  { key: 'state', label: 'State' },
  { key: 'async', label: 'Async' },
  { key: 'styles', label: 'CSS Modules / Less' },
  { key: 'assets', label: 'Assets' },
  { key: 'svg', label: 'SVG' },
]
