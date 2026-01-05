import styles from '../RemoteCard.module.css'

export function StylesDemo() {
  return (
    <div>
      <h3 className={styles.sectionTitle}>CSS Modules / Less</h3>
      <div className={styles.row}>
        <span className={styles.pill}>module.css scoped class</span>
        <span className="devToRemoteLess__badge">less variable + nesting</span>
      </div>

      <div className="devToRemoteLess">
        <p className="devToRemoteLess__title">
          <span>This block is styled by </span>
          <span className="devToRemoteLess__badge">Less</span>
        </p>
        <p className="devToRemoteLess__note">
          <span>It also references an asset via </span>
          <code>url(&apos;./assets/pixel.png&apos;)</code>
        </p>
        <div className="devToRemoteLess__texture" />
      </div>
    </div>
  )
}
