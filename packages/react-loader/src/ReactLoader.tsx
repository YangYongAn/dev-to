import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import type { Root } from 'react-dom/client'

import {
  DEV_TO_REACT_BASE_PATH,
  DEV_TO_REACT_CONTRACT_PATH,
  DEV_TO_REACT_DEBUG_HTML_PATH,
  DEV_TO_REACT_INIT_PATH,
  DEV_TO_REACT_NAMESPACE,
  type DevToReactBridgeContract,
} from '@dev-to/react-shared'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function unwrapDefault(value: unknown): unknown {
  if (!isRecord(value)) return value
  const defaultValue = value['default']
  return defaultValue != null ? defaultValue : value
}

interface ErrorWithStatusCode extends Error {
  statusCode?: number | string
}

type RemoteCreateElement = typeof import('react').createElement

interface RemoteReactRuntime {
  React: { createElement: RemoteCreateElement }
  ReactDOMClient: { createRoot: (container: Element | DocumentFragment) => Root }
}

function toError(value: unknown): ErrorWithStatusCode {
  return value instanceof Error ? value : new Error(String(value))
}

function resolveRemoteRuntime(runtimeModule: unknown): RemoteReactRuntime {
  const runtimeRecord = isRecord(runtimeModule) ? runtimeModule : {}

  const reactCandidate = runtimeRecord['default'] ?? runtimeRecord['React'] ?? runtimeModule
  const domCandidate = runtimeRecord['ReactDOMClient']

  if (
    !isRecord(reactCandidate)
    || typeof reactCandidate['createElement'] !== 'function'
    || !isRecord(domCandidate)
    || typeof domCandidate['createRoot'] !== 'function'
  ) {
    throw new Error('Invalid React runtime module from dev server.')
  }

  return {
    React: reactCandidate as RemoteReactRuntime['React'],
    ReactDOMClient: domCandidate as RemoteReactRuntime['ReactDOMClient'],
  }
}

/**
 * --- DevTo React Bridge Protocol Types & Utils ---
 */

export const DEFAULT_CONTRACT_ENDPOINT = DEV_TO_REACT_CONTRACT_PATH
export const DEFAULT_INIT_ENDPOINT = DEV_TO_REACT_INIT_PATH

function resolveEndpointUrl(origin: string, endpoint: string) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint
  if (endpoint.startsWith('/')) return `${origin}${endpoint}`
  return `${origin}/${endpoint}`
}

function isBridgeContract(value: unknown): value is DevToReactBridgeContract {
  if (!isRecord(value)) return false

  const paths = value['paths']
  const events = value['events']

  if (!isRecord(paths) || typeof paths['reactRuntime'] !== 'string') return false
  if (!isRecord(events) || typeof events['fullReload'] !== 'string') return false

  return true
}

function resolveContract(initModule: unknown): DevToReactBridgeContract {
  const moduleRecord = isRecord(initModule) ? initModule : {}
  const contractCandidate
    = moduleRecord['DEV_TO_REACT_CONTRACT'] ?? moduleRecord['default'] ?? null

  if (!contractCandidate) {
    throw new Error(
      'Dev server contract not found. Please ensure `@dev-to/react-plugin` (devToReactPlugin) is enabled in the Vite dev server.',
    )
  }

  if (!isBridgeContract(contractCandidate)) {
    throw new Error('Invalid dev server contract.')
  }

  return contractCandidate
}

const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<unknown>

const contractCache = new Map<string, Promise<DevToReactBridgeContract>>()
const initCache = new Map<string, Promise<void>>()

/** 加载远程 dev server 的桥接合约（无副作用） */
export async function loadBridgeContract(
  origin: string,
  contractEndpoint?: string,
): Promise<DevToReactBridgeContract> {
  const endpoint = contractEndpoint || DEFAULT_CONTRACT_ENDPOINT
  const initUrl = resolveEndpointUrl(origin, endpoint)

  if (contractCache.has(initUrl)) return contractCache.get(initUrl)!

  const p = nativeImport(initUrl)
    .then(m => resolveContract(m))
    .catch(async (e) => {
      contractCache.delete(initUrl)
      const err: ErrorWithStatusCode = e instanceof Error ? e : new Error(String(e))
      if (err.message.includes('Failed to fetch')) {
        try {
          const resp = await fetch(initUrl, { method: 'HEAD' }).catch(() => null)
          if (resp) err.statusCode = resp.status
        }
        catch {
          // ignore
        }
      }
      throw err
    })

  contractCache.set(initUrl, p)
  return p
}

/** 初始化远程 dev server 的 HMR/Refresh 运行时 */
export async function ensureBridgeInit(origin: string, contract: DevToReactBridgeContract) {
  const initPath = contract?.paths?.initClient || DEFAULT_INIT_ENDPOINT
  const initUrl = resolveEndpointUrl(origin, initPath)

  if (initCache.has(initUrl)) return initCache.get(initUrl)!

  const p = nativeImport(initUrl)
    .then(() => void 0)
    .catch((e) => {
      initCache.delete(initUrl)
      throw e instanceof Error ? e : new Error(String(e))
    })
  initCache.set(initUrl, p)
  return p
}

/**
 * --- Entry Resolution Logic (Core Engine) ---
 */

export interface ReactEntryResolutionResult {
  success: true
  entryUrl: string
}

export interface ReactEntryResolutionError {
  success: false
  error: {
    message: string
    type: 'COMPONENT_NOT_FOUND' | 'CONTRACT_LOAD_FAILED'
    componentName?: string
    errorReason?: string
    setupGuide?: {
      title: string
      steps: string[]
    }
  }
}

export type ReactEntryResolution = ReactEntryResolutionResult | ReactEntryResolutionError

/**
 * Core engine: Resolve dev server entry URL for a given component name from contract.
 * This is business-agnostic and only handles the matching logic.
 */
export async function resolveReactEntry(
  origin: string,
  componentName: string,
  contractEndpoint?: string,
): Promise<ReactEntryResolution> {
  try {
    const contract = await loadBridgeContract(origin, contractEndpoint)
    const dev = contract?.dev || {}
    const componentMap = dev.componentMap || {}

    // Matching strategy:
    // 1. Explicit mapping: componentMap key matches componentName
    // 2. Wildcard mapping: '*' key acts as fallback for all components
    const entry = componentMap[componentName] || componentMap['*']

    if (!entry) {
      const errorMessage = `Component "${componentName}" not found in devComponentMap`
      const isWildcardMode = !!componentMap['*']
      const errorReason = isWildcardMode
        ? `The component "${componentName}" is not configured, and the wildcard fallback is also missing or invalid.`
        : `The component "${componentName}" is not configured in devComponentMap. Please add it to your Vite configuration.`

      return {
        success: false,
        error: {
          message: errorMessage,
          type: 'COMPONENT_NOT_FOUND',
          componentName,
          errorReason,
          setupGuide: {
            title: 'Setup Guide',
            steps: [
              `import { devToReactPlugin } from '@dev-to/react-plugin'`,
              '',
              `// Option 1: Shorthand (Default)`,
              `devToReactPlugin('${componentName}')`,
              '',
              `// Option 2: Explicit Mapping`,
              `devToReactPlugin({`,
              `  '${componentName}': '/', // Default entry`,
              `  'Other': 'src/Card.tsx' // Specific file`,
              `})`,
            ],
          },
        },
      }
    }

    const entryUrl
      = entry.startsWith('http://') || entry.startsWith('https://')
        ? entry
        : `${origin}${entry.startsWith('/') ? '' : '/'}${entry}`

    return {
      success: true,
      entryUrl,
    }
  }
  catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return {
      success: false,
      error: {
        message: errorMessage,
        type: 'CONTRACT_LOAD_FAILED',
      },
    }
  }
}

/**
 * Engine helper for host/business layer:
 * Resolve entry and convert failures into a loader-friendly error object.
 */
export async function resolveReactEntryForLoader(
  origin: string,
  componentName: string,
  contractEndpoint?: string,
): Promise<
  { success: true, entryUrl: string }
  | { success: false, loaderError: ReactLoaderError }
> {
  const r = await resolveReactEntry(origin, componentName, contractEndpoint)
  if (r.success) return r

  const e = (r as ReactEntryResolutionError).error
  return {
    success: false,
    loaderError: {
      message: e.message,
      origin,
      componentName: e.componentName || componentName,
      type: e.type,
      errorReason: e.errorReason,
      setupGuide: e.setupGuide,
    },
  }
}

/**
 * --- Component State & Loader Logic ---
 */

interface ReactLoaderState {
  containerRef: MutableRefObject<HTMLDivElement | null>
  isReady: boolean
  error: Error | ReactLoaderError | null
}

export interface ReactLoaderError {
  message: string
  origin?: string
  componentName?: string
  type?: string
  errorReason?: string
  statusCode?: number | string
  setupGuide?: {
    title: string
    steps: string[]
  }
}

export interface ReactLoaderProps<P extends Record<string, unknown> = Record<string, unknown>> {
  /** Dev server origin (e.g., http://localhost:5173). Required if url is not provided. */
  origin?: string
  /** Component name to resolve. Required if url is not provided. */
  name?: string
  /** Direct entry URL (bypass internal resolution) */
  url?: string
  contractEndpoint?: string
  componentProps: P
  loading?: ReactNode
  /** @deprecated Resolution error is now handled internally via origin/name props */
  externalError?: ReactLoaderError | null
  /** 内部预留：允许覆盖默认错误渲染 */
  renderError?: (error: Error | ReactLoaderError) => ReactNode
}

function safeLocationHref(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.location.href
  }
  catch {
    return ''
  }
}

function safeOrigin(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.location.origin
  }
  catch {
    return ''
  }
}

function getOriginFromFinalJsUrl(finalJsUrl: string) {
  let origin = ''
  try {
    const urlParam = finalJsUrl.match(/url=([^&]+)/)?.[1] || ''
    const decoded = urlParam ? decodeURIComponent(urlParam) : finalJsUrl
    const parsed = decoded.startsWith('http')
      ? new URL(decoded)
      : new URL(decoded, safeLocationHref() || 'http://localhost')
    origin = parsed.origin
  }
  catch {
    origin = safeOrigin()
  }
  return origin
}

function useReactLoader<P extends Record<string, unknown> = Record<string, unknown>>(
  options: Pick<
    ReactLoaderProps<P>,
    'url' | 'origin' | 'name' | 'componentProps' | 'contractEndpoint'
  >,
): ReactLoaderState & { resolvedUrl?: string } {
  const { url: directUrl, origin, name, componentProps, contractEndpoint } = options

  const containerRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<Root | null>(null)
  const runtimeRef = useRef<RemoteReactRuntime | null>(null)
  const cardRef = useRef<ComponentType<P> | null>(null)
  const fullReloadListenerRef = useRef<{ eventName: string, handler: () => void } | null>(null)

  const propsRef = useRef(componentProps)
  propsRef.current = componentProps

  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | ReactLoaderError | null>(null)
  const [version, setVersion] = useState(0)
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(directUrl)

  // 1. Internal Resolution Effect: Convert (origin + name) -> entryUrl
  useEffect(() => {
    if (directUrl) {
      setResolvedUrl(directUrl)
      setError(null)
      return
    }

    if (!origin || !name) {
      if (!directUrl && (origin || name)) {
        setError(new Error('Missing dev server origin or component name for resolution.'))
      }
      return
    }

    let cancelled = false
    setIsReady(false)
    setError(null)

    resolveReactEntryForLoader(origin, name, contractEndpoint).then((res) => {
      if (cancelled) return
      if (res.success === true) {
        setResolvedUrl(res.entryUrl)
      }
      else {
        setError(res.loaderError)
      }
    })

    return () => {
      cancelled = true
    }
  }, [directUrl, origin, name, contractEndpoint])

  // 2. Full Reload Listener
  const ensureFullReloadListener = useCallback((eventName: string) => {
    if (!eventName) return
    if (typeof window === 'undefined') return
    const { current } = fullReloadListenerRef
    if (current?.eventName === eventName) return
    if (current) {
      window.removeEventListener(current.eventName, current.handler)
    }

    const handler = () => {
      setVersion(v => v + 1)
    }
    window.addEventListener(eventName, handler)
    fullReloadListenerRef.current = { eventName, handler }
  }, [])

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return
      const { current } = fullReloadListenerRef
      if (current) {
        window.removeEventListener(current.eventName, current.handler)
      }
    }
  }, [])

  const renderViteRoot = useCallback(() => {
    const runtime = runtimeRef.current
    const Card = cardRef.current
    if (!runtime || !Card) return

    if (!containerRef.current) return

    if (!rootRef.current) {
      rootRef.current = runtime.ReactDOMClient.createRoot(containerRef.current)
    }

    rootRef.current.render(runtime.React.createElement(Card, propsRef.current))
  }, [])

  const loadViteComponent = useCallback(
    async (entryUrl: string, exportName: string | undefined, currentVersion: number) => {
      if (!entryUrl) throw new Error('Not found entry url.')

      const originFromUrl = getOriginFromFinalJsUrl(entryUrl)

      const connector = entryUrl.includes('?') ? '&' : '?'
      const jsUrlWithParam
        = currentVersion > 0 ? `${entryUrl}${connector}v=${currentVersion}` : entryUrl

      try {
        const contract = await loadBridgeContract(originFromUrl, contractEndpoint)
        // IMPORTANT: init MUST happen before importing react-dom/client for Fast Refresh.
        await ensureBridgeInit(originFromUrl, contract)
        ensureFullReloadListener(contract.events.fullReload)

        const runtimeModule = await nativeImport(`${originFromUrl}${contract.paths.reactRuntime}`)
        const runtime = resolveRemoteRuntime(runtimeModule)

        const moduleNs = await nativeImport(jsUrlWithParam)
        const moduleRecord = isRecord(moduleNs) ? moduleNs : {}

        const exportCandidate = exportName ? moduleRecord[exportName] : undefined
        const candidate = exportName
          ? exportCandidate ?? moduleRecord['default'] ?? moduleNs
          : moduleRecord['default'] ?? moduleNs
        const Card = unwrapDefault(candidate)

        if (Card) return { Card: Card as ComponentType<P>, runtime }
        throw new Error('Vite Dev Component Load Fail: Component not found in module.')
      }
      catch (e) {
        const err = toError(e)
        if (err.message.includes('Failed to fetch')) {
          try {
            const resp = await fetch(jsUrlWithParam, { method: 'HEAD' }).catch(() => null)
            if (resp) err.statusCode = resp.status
          }
          catch {
            // ignore
          }
        }
        throw err
      }
    },
    [contractEndpoint, ensureFullReloadListener],
  )

  useEffect(() => {
    if (!resolvedUrl) return

    let cancelled = false
    setIsReady(false)
    // Only reset generic errors, keep resolution errors
    if (error instanceof Error) setError(null)

    loadViteComponent(resolvedUrl, name, version)
      .then(({ Card, runtime }) => {
        if (cancelled) return
        runtimeRef.current = runtime
        cardRef.current = Card
        setIsReady(true)
        renderViteRoot()
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setIsReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [loadViteComponent, renderViteRoot, resolvedUrl, name, version, error])

  useEffect(() => {
    if (isReady) renderViteRoot()
  })

  useEffect(() => {
    return () => {
      try {
        rootRef.current?.unmount?.()
      }
      catch {
        // ignore
      }
      rootRef.current = null
    }
  }, [])

  useEffect(() => {
    if (error) {
      try {
        rootRef.current?.unmount?.()
      }
      catch {
        // ignore
      }
      rootRef.current = null
    }
  }, [error])

  return { containerRef, isReady, error, resolvedUrl }
}

function InlineViteErrorView(props: {
  errorMessage: string
  currentOrigin: string
  componentName?: string
  setupGuide?: { title: string, steps: string[] }
  statusCode?: number | string
}) {
  const { errorMessage, currentOrigin, componentName, setupGuide, statusCode } = props

  const isComponentNotFound = errorMessage.includes('not found in devComponentMap')
  const isFetchError = errorMessage.includes('Failed to fetch dynamically imported module')
  const isInternalBridgeFile
    = errorMessage.includes(DEV_TO_REACT_BASE_PATH)
      || errorMessage.includes(DEV_TO_REACT_NAMESPACE)
  const isContractError
    = errorMessage.includes('Vite dev contract not found')
      || errorMessage.includes('Failed to load Vite bridge contract')
      || errorMessage.includes('Failed to load contract from')
      || (isFetchError && isInternalBridgeFile)

  const isModuleFetchError = isFetchError && !isInternalBridgeFile

  let title = 'Vite Server Error'
  let typeLabel = statusCode?.toString() || '500'

  if (isComponentNotFound) {
    title = 'Component Not Configured'
    typeLabel = '412'
  }
  else if (isModuleFetchError) {
    title = 'Vite Module Not Found'
    typeLabel = statusCode?.toString() || '404'
  }
  else if (isContractError) {
    title = 'Vite Server Connection Failed'
    typeLabel = statusCode?.toString() || '503'
  }

  const theme: 'urgent' | 'warning' = isContractError ? 'urgent' : 'warning'
  const palette
    = theme === 'urgent'
      ? {
          bg: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)',
          border: '#fecaca',
          title: '#dc2626',
          accent: '#dc2626',
          pillBg: 'rgba(220, 38, 38, 0.05)',
          pillBorder: 'rgba(220, 38, 38, 0.2)',
          tipsBg: '#fffbeb',
          tipsBorder: '#fde68a',
          tipsText: '#92400e',
        }
      : {
          bg: 'linear-gradient(135deg, #fffbeb 0%, #fffdf2 100%)',
          border: '#fde68a',
          title: '#d97706',
          accent: '#d97706',
          pillBg: 'rgba(217, 119, 6, 0.05)',
          pillBorder: 'rgba(217, 119, 6, 0.2)',
          tipsBg: '#fffbeb',
          tipsBorder: '#fde68a',
          tipsText: '#92400e',
        }

  const styles: Record<string, CSSProperties> = {
    container: {
      padding: 12,
      borderRadius: 8,
      background: palette.bg,
      border: `1px solid ${palette.border}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
      paddingBottom: 8,
      borderBottom: `1px solid ${palette.border}66`,
    },
    icon: {
      fontSize: 18,
      fontFamily:
        '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
    },
    title: {
      fontSize: 12,
      fontWeight: 700,
      color: palette.title,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    typeTag: {
      fontSize: 11,
      fontWeight: 700,
      padding: '1px 6px',
      borderRadius: 999,
      border: `1px solid ${palette.pillBorder}`,
      background: palette.pillBg,
      color: palette.accent,
      lineHeight: 1,
    },
    content: { display: 'flex', flexDirection: 'column', gap: 8 },
    message: {
      fontSize: 9,
      color: '#991b1b',
      background: '#fee2e2',
      padding: 5,
      borderRadius: 6,
      borderLeft: `1px solid ${palette.accent}`,
      whiteSpace: 'pre-wrap',
      fontFamily: 'monospace',
      wordBreak: 'break-word',
    },
    info: {
      background: '#fff',
      padding: '8px 10px',
      borderRadius: 6,
      border: `1px solid ${palette.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    },
    infoRow: { display: 'flex', gap: 8, alignItems: 'center' },
    label: { fontSize: 11, color: '#64748b', fontWeight: 600, width: 110, textAlign: 'right' },
    value: {
      fontSize: 11,
      color: '#1e293b',
      background: '#f8fafc',
      padding: '3px 6px',
      borderRadius: 4,
      fontFamily: 'monospace',
      border: '1px solid #e2e8f0',
      wordBreak: 'break-word',
      flex: 1,
    },
    tips: {
      background: palette.tipsBg,
      padding: '8px 10px',
      borderRadius: 6,
      border: `1px solid ${palette.tipsBorder}`,
    },
    tipsTitle: {
      fontSize: 12,
      fontWeight: 800,
      color: palette.tipsText,
      marginBottom: 6,
      textAlign: 'center',
    },
    list: { padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 },
    li: { fontSize: 11, color: '#78350f' },
    code: { fontFamily: 'monospace', fontSize: 10 },
    link: { color: '#2563eb' },
    codeBlock: {
      padding: '10px 12px',
      background: '#1e293b',
      borderRadius: 6,
      border: '1px solid #334155',
      overflowX: 'auto',
      fontSize: 11,
      color: '#e2e8f0',
      fontFamily: 'monospace',
    },
    codeComment: { color: '#94a3b8', fontStyle: 'italic' },
  }

  const debugPanelUrl = `${currentOrigin}${DEV_TO_REACT_DEBUG_HTML_PATH}`
  const componentNameLabel = componentName || ''

  return (
    <div className="vdev-container" style={styles.container}>
      <div className="vdev-header" style={styles.header}>
        <div className="vdev-icon" style={styles.icon}>
          {'\u26A0\uFE0F'}
        </div>
        <div className="vdev-title" style={styles.title}>
          <span className="vdev-type-tag" style={styles.typeTag}>
            {typeLabel}
          </span>
          {title}
        </div>
      </div>

      <div className="vdev-content" style={styles.content}>
        <div className="vdev-message" style={styles.message}>
          {errorMessage}
        </div>

        <div className="vdev-info" style={styles.info}>
          <div className="vdev-info-row" style={styles.infoRow}>
            <span className="vdev-label" style={styles.label}>
              Server Address:
            </span>
            <code className="vdev-value" style={styles.value}>
              {currentOrigin}
            </code>
          </div>
          {componentNameLabel
            ? (
                <div className="vdev-info-row" style={styles.infoRow}>
                  <span className="vdev-label" style={styles.label}>
                    Component Name:
                  </span>
                  <code className="vdev-value" style={styles.value}>
                    {componentNameLabel}
                  </code>
                </div>
              )
            : null}
        </div>

        <div className="vdev-tips" style={styles.tips}>
          <div className="vdev-tips-title" style={styles.tipsTitle}>
            Next Steps:
          </div>
          {setupGuide
            ? (
                <pre className="vdev-code-block" style={styles.codeBlock}>
                  {setupGuide.steps.map((step, idx) => {
                    const stepKey = `step-${idx}`
                    const commentIdx = step.indexOf('//')
                    if (commentIdx === -1) {
                      return <div key={stepKey}>{step || ' '}</div>
                    }
                    const codePart = step.substring(0, commentIdx)
                    const commentPart = step.substring(commentIdx)
                    return (
                      <div key={stepKey}>
                        <span>{codePart}</span>
                        <span className="vdev-code-comment" style={styles.codeComment}>
                          {commentPart}
                        </span>
                      </div>
                    )
                  })}
                </pre>
              )
            : (
                <ul className="vdev-list" style={styles.list}>
                  {isModuleFetchError
                    ? (
                        <>
                          <li className="vdev-li" style={styles.li}>
                            <b>Verify Path</b>
                            : check the entry mapping for
                            {' '}
                            <code className="vdev-code" style={styles.code}>
                              {componentNameLabel || 'this component'}
                            </code>
                            {' '}
                            in
                            {' '}
                            <code className="vdev-code" style={styles.code}>
                              vite.config.ts
                            </code>
                            .
                          </li>
                          <li className="vdev-li" style={styles.li}>
                            <b>Check Terminal</b>
                            : look at the terminal where
                            {' '}
                            <code className="vdev-code" style={styles.code}>
                              {currentOrigin}
                            </code>
                            {' '}
                            is running for build errors.
                          </li>
                          <li className="vdev-li" style={styles.li}>
                            <b>Check Export</b>
                            : ensure the entry module exports a React component (default
                            export recommended).
                          </li>
                        </>
                      )
                    : null}

                  {isComponentNotFound
                    ? (
                        <>
                          <li className="vdev-li" style={styles.li}>
                            <b>Update Config</b>
                            : map
                            {' '}
                            <code className="vdev-code" style={styles.code}>
                              {componentNameLabel}
                            </code>
                            {' '}
                            in
                            {' '}
                            <code className="vdev-code" style={styles.code}>
                              devComponentMap
                            </code>
                            .
                          </li>
                          <li className="vdev-li" style={styles.li}>
                            <b>Wildcard Fallback</b>
                            : add
                            {' '}
                            <code className="vdev-code" style={styles.code}>{`'*': '/'`}</code>
                            {' '}
                            to map all
                            components to the default entry.
                          </li>
                        </>
                      )
                    : null}

                  {isContractError
                    ? (
                        <>
                          <li className="vdev-li" style={styles.li}>
                            <b>Check Server</b>
                            : ensure your Vite server is running at
                            {' '}
                            <code className="vdev-code" style={styles.code}>
                              {currentOrigin}
                            </code>
                            .
                          </li>
                          <li className="vdev-li" style={styles.li}>
                            <b>Verify Origin</b>
                            : confirm localStorage key
                            {' '}
                            <code className="vdev-code" style={styles.code}>
                              VITE_DEV_SERVER_ORIGIN
                            </code>
                            {' '}
                            is set to
                            {' '}
                            <code className="vdev-code" style={styles.code}>
                              {currentOrigin}
                            </code>
                            .
                          </li>
                          <li className="vdev-li" style={styles.li}>
                            <b>Open Debug Panel</b>
                            :
                            {' '}
                            <a
                              className="vdev-link"
                              style={styles.link}
                              href={debugPanelUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {debugPanelUrl}
                            </a>
                          </li>
                        </>
                      )
                    : null}

                  {!isModuleFetchError && !isComponentNotFound && !isContractError
                    ? (
                        <li className="vdev-li" style={styles.li}>
                          Open Debug Panel:
                          {' '}
                          <a
                            className="vdev-link"
                            style={styles.link}
                            href={debugPanelUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {debugPanelUrl}
                          </a>
                        </li>
                      )
                    : null}
                </ul>
              )}
        </div>
      </div>
    </div>
  )
}

/**
 * React 开发态 ESM 组件加载器（宿主内联复用）
 */
export function ReactLoader<P extends Record<string, unknown> = Record<string, unknown>>(
  props: ReactLoaderProps<P>,
) {
  const {
    url,
    origin,
    name,
    componentProps,
    contractEndpoint,
    loading,
    renderError,
    externalError,
  } = props

  const state = useReactLoader<P>({ url, origin, name, componentProps, contractEndpoint })
  const defaultLoading = <div>Loading...</div>

  const renderErrorNode = useCallback(
    (err: Error | ReactLoaderError) => {
      if (renderError) return renderError(err)
      const isLoaderErrorObject = !(err instanceof Error)
      const errorMessage = err.message || String(err)
      const currentOrigin
        = (isLoaderErrorObject ? err.origin : undefined) || origin || (url ? getOriginFromFinalJsUrl(url) : '')
      const componentName = (isLoaderErrorObject ? err.componentName : undefined) || name
      const setupGuide = isLoaderErrorObject ? err.setupGuide : undefined
      const statusCode = isLoaderErrorObject ? err.statusCode : (err as ErrorWithStatusCode).statusCode
      return (
        <InlineViteErrorView
          errorMessage={errorMessage}
          currentOrigin={currentOrigin}
          componentName={componentName}
          setupGuide={setupGuide}
          statusCode={statusCode}
        />
      )
    },
    [renderError, name, origin, url],
  )

  if (externalError) {
    return <>{renderErrorNode(externalError)}</>
  }

  if (state.error) {
    return <>{renderErrorNode(state.error)}</>
  }

  return (
    <>
      <div ref={state.containerRef} className="vdev-loader-container" data-is="ReactLoader" />
      {!state.isReady ? (loading ?? defaultLoading) : null}
    </>
  )
}
