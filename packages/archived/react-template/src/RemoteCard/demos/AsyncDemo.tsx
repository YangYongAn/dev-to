import { useEffect, useState } from 'react'

import styles from '../RemoteCard.module.css'
import { delay } from '../utils'

import type { RemotePayload } from '../data/remotePayload'

export function AsyncDemo() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [data, setData] = useState<RemotePayload | null>(null)
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState(0)
  const [simulateError, setSimulateError] = useState(false)

  useEffect(() => {
    if (requestId === 0) return

    let cancelled = false
    setStatus('loading')
    setData(null)
    setError('')

    ;(async () => {
      await delay(450)
      if (simulateError) {
        throw new Error('Simulated async error (for testing error UI).')
      }
      const mod = await import('../data/remotePayload')
      return mod.payload
    })()
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        setStatus('ready')
      })
      .catch((e) => {
        if (cancelled) return
        setStatus('error')
        setError(e instanceof Error ? e.message : String(e))
      })

    return () => {
      cancelled = true
    }
  }, [requestId, simulateError])

  return (
    <div>
      <h3 className={styles.sectionTitle}>Async / Dynamic Import</h3>
      <div className={styles.row}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          type="button"
          onClick={() => {
            setSimulateError(false)
            setRequestId(id => id + 1)
          }}
        >
          Load data
        </button>
        <button
          className={`${styles.button} ${styles.buttonDanger}`}
          type="button"
          onClick={() => {
            setSimulateError(true)
            setRequestId(id => id + 1)
          }}
        >
          Load (error)
        </button>
      </div>

      <div className={styles.preview}>
        {status === 'idle' && <div>Click “Load data” to start.</div>}
        {status === 'loading' && <div>Loading…</div>}
        {status === 'error' && (
          <div>
            <div className={styles.row}>
              <b>Error:</b>
              <code>{error}</code>
            </div>
          </div>
        )}
        {status === 'ready' && data && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                alignItems: 'center',
                color: '#475569',
                fontSize: 12,
              }}
            >
              <span>{data.server}</span>
              <span>·</span>
              <span>generatedAt:</span>
              <code>{data.generatedAt}</code>
            </div>
            <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
              {data.todos.map(item => (
                <li key={item.id}>
                  <span>{item.done ? '✅' : '⬜'}</span>
                  <span>{item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
