import styles from '../RemoteCard.module.css'
import { exampleJpgUrl, pixelUrl } from '../assets'

export function AssetsDemo() {
  const resolvedByUrlCtor = new URL('../assets/pixel.png', import.meta.url).href

  return (
    <div>
      <h3 className={styles.sectionTitle}>Assets (PNG/JPG) / URL Resolution</h3>

      <div className={styles.preview}>
        <div className={styles.row}>
          <img
            alt="pixel"
            src={pixelUrl}
            width={64}
            height={64}
            style={{ imageRendering: 'pixelated', borderRadius: 12, border: '1px solid #e2e8f0' }}
          />
          <img
            alt="example jpg"
            src={exampleJpgUrl}
            width={64}
            height={64}
            style={{ borderRadius: 12, border: '1px solid #e2e8f0', objectFit: 'cover' }}
          />
          <div style={{ fontSize: 12, color: '#334155' }}>
            <div>
              <span>Imported URL:</span>
              <code>{pixelUrl}</code>
            </div>
            <div style={{ marginTop: 6 }}>
              <span>new URL(..., import.meta.url):</span>
              <code>{resolvedByUrlCtor}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
