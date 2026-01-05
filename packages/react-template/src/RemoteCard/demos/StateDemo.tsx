import { useMemo, useState } from 'react'

import styles from '../RemoteCard.module.css'

export function StateDemo() {
  const [count, setCount] = useState(0)
  const [enabled, setEnabled] = useState(true)

  const doubled = useMemo(() => count * 2, [count])
  const status = enabled ? 'enabled' : 'disabled'

  return (
    <div>
      <h3 className={styles.sectionTitle}>State / Derived Values</h3>
      <div className={styles.row}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          type="button"
          onClick={() => setCount(c => c + 1)}
        >
          +1
        </button>
        <button className={styles.button} type="button" onClick={() => setCount(0)}>
          reset
        </button>
        <button className={styles.button} type="button" onClick={() => setEnabled(v => !v)}>
          toggle (
          <code>{status}</code>
          )
        </button>
      </div>

      <div className={styles.kv}>
        <span>count</span>
        <code>{String(count)}</code>
        <span>doubled</span>
        <code>{String(doubled)}</code>
        <span>flag</span>
        <code>{status}</code>
      </div>
    </div>
  )
}
