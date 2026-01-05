import { useMemo, useState } from 'react'

import { ReactLoader } from '@dev-to/react-loader'

export default function App() {
  const [origin, setOrigin] = useState('http://localhost:5173')
  const [name, setName] = useState('RemoteCard')

  const componentProps = useMemo(() => ({ title: 'Loaded by @dev-to/react-loader' }), [])

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 20 }}>@dev-to/react-playground</h1>
      <p style={{ margin: '8px 0 16px', color: '#475569' }}>
        Rspack host app loading a remote component from Vite dev server.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 64, color: '#0f172a' }}>Origin</span>
          <input
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            style={{ width: 320, padding: '6px 10px' }}
          />
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 64, color: '#0f172a' }}>Name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: 200, padding: '6px 10px' }}
          />
        </label>
      </div>

      <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0' }}>
        <ReactLoader origin={origin} name={name} componentProps={componentProps} />
      </div>
    </div>
  )
}
