import styles from '../RemoteCard.module.css'
import { devToLogoRaw, devToLogoUrl } from '../assets'

export function SvgDemo() {
  const shortRaw = devToLogoRaw.length > 220 ? `${devToLogoRaw.slice(0, 220)}…` : devToLogoRaw

  return (
    <div>
      <h3 className={styles.sectionTitle}>SVG</h3>
      <div className={styles.preview}>
        <div className={styles.row}>
          <img alt="dev-to logo" src={devToLogoUrl} width={64} height={64} style={{ borderRadius: 14 }} />
          <div style={{ fontSize: 12, color: '#334155' }}>
            <div>
              <span>URL import:</span>
              <code>{devToLogoUrl}</code>
            </div>
            <div style={{ marginTop: 6 }}>
              <span>Raw import:</span>
              <code>?raw</code>
              <span>(preview below)</span>
            </div>
          </div>
        </div>
        <pre className={styles.code}>{shortRaw}</pre>
      </div>
    </div>
  )
}
