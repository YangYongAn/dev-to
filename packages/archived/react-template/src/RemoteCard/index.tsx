import { useState } from 'react'

import styles from './RemoteCard.module.css'
import './RemoteCard.less'

import { devToLogoUrl } from './assets'
import { tabs, type TabKey } from './tabs'

import { AsyncDemo } from './demos/AsyncDemo'
import { AssetsDemo } from './demos/AssetsDemo'
import { StateDemo } from './demos/StateDemo'
import { StylesDemo } from './demos/StylesDemo'
import { SvgDemo } from './demos/SvgDemo'

import type { RemoteCardProps } from './types'

export type { RemoteCardProps } from './types'

export default function RemoteCard(props: RemoteCardProps) {
  const [tab, setTab] = useState<TabKey>('state')

  const panel = (() => {
    if (tab === 'state') return <StateDemo />
    if (tab === 'async') return <AsyncDemo />
    if (tab === 'styles') return <StylesDemo />
    if (tab === 'assets') return <AssetsDemo />
    return <SvgDemo />
  })()

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{props.title}</h2>
          <p className={styles.subtitle}>
            <span>Remote component served by Vite, consumed by</span>
            <code>@dev-to/react-loader</code>
          </p>
          <div className={styles.metaRow}>
            <span className={styles.pill}>HMR / Fast Refresh</span>
            <span className={styles.pill}>Cross-origin module</span>
            <span className={styles.pill}>ESM + assets</span>
          </div>
        </div>
        <img className={styles.logo} alt="dev-to" src={devToLogoUrl} />
      </header>

      <nav className={styles.tabs} aria-label="RemoteCard demos">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className={styles.panel}>
        {panel}
      </div>
    </section>
  )
}
