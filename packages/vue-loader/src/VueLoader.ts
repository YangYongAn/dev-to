import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue'

import {
  DEV_TO_DEBUG_HTML_PATH,
  DEV_TO_DISCOVERY_PATH,
  DEV_TO_VUE_CONTRACT_PATH,
  DEV_TO_VUE_INIT_PATH,
  type DevToDiscoveryContract,
  type DevToVueBridgeContract,
} from '@dev-to/shared'

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

type RemoteVueRuntime = typeof import('vue')

function toError(value: unknown): ErrorWithStatusCode {
  return value instanceof Error ? value : new Error(String(value))
}

function resolveRemoteRuntime(runtimeModule: unknown): RemoteVueRuntime {
  const runtimeRecord = isRecord(runtimeModule) ? runtimeModule : {}
  const vueCandidate = runtimeRecord['default'] ?? runtimeRecord['Vue'] ?? runtimeModule

  if (
    !isRecord(vueCandidate)
    || typeof vueCandidate['createApp'] !== 'function'
    || typeof vueCandidate['h'] !== 'function'
    || typeof vueCandidate['defineComponent'] !== 'function'
  ) {
    throw new Error('Invalid Vue runtime module from dev server.')
  }

  return vueCandidate as RemoteVueRuntime
}

export const DEFAULT_DISCOVERY_ENDPOINT = DEV_TO_DISCOVERY_PATH
export const DEFAULT_CONTRACT_ENDPOINT = DEV_TO_VUE_CONTRACT_PATH
export const DEFAULT_INIT_ENDPOINT = DEV_TO_VUE_INIT_PATH

function resolveEndpointUrl(origin: string, endpoint: string) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint
  if (endpoint.startsWith('/')) return `${origin}${endpoint}`
  return `${origin}/${endpoint}`
}

function isBridgeContract(value: unknown): value is DevToVueBridgeContract {
  if (!isRecord(value)) return false

  const paths = value['paths']
  const events = value['events']

  if (!isRecord(paths) || typeof paths['vueRuntime'] !== 'string') return false
  return !(!isRecord(events) || typeof events['fullReload'] !== 'string')
}

function resolveContract(initModule: unknown): DevToVueBridgeContract {
  const moduleRecord = isRecord(initModule) ? initModule : {}
  const contractCandidate = moduleRecord['DEV_TO_VUE_CONTRACT'] ?? moduleRecord['default'] ?? null

  if (!contractCandidate) {
    throw new Error(
      'Dev server contract not found. Please ensure `@dev-to/vue-plugin` (devToVuePlugin) is enabled in the Vite dev server.',
    )
  }

  if (!isBridgeContract(contractCandidate)) {
    throw new Error('Invalid dev server contract.')
  }

  return contractCandidate
}

const nativeImport = new Function('url', 'return import(url)') as (url: string) => Promise<unknown>

const discoveryCache = new Map<string, Promise<DevToDiscoveryContract>>()
const contractCache = new Map<string, Promise<DevToVueBridgeContract>>()
const initCache = new Map<string, Promise<void>>()

export async function loadDiscoveryContract(
  origin: string,
  discoveryEndpoint?: string,
): Promise<DevToDiscoveryContract> {
  const endpoint = discoveryEndpoint || DEFAULT_DISCOVERY_ENDPOINT
  const discoveryUrl = resolveEndpointUrl(origin, endpoint)

  if (discoveryCache.has(discoveryUrl)) return discoveryCache.get(discoveryUrl)!

  const p = fetch(discoveryUrl)
    .then(async (resp) => {
      if (!resp.ok) {
        throw new Error(`Discovery endpoint returned ${resp.status}: ${resp.statusText}`)
      }
      const data = await resp.json()
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid discovery response: not a JSON object')
      }
      return data as DevToDiscoveryContract
    })
    .catch((e) => {
      discoveryCache.delete(discoveryUrl)
      throw e instanceof Error ? e : new Error(String(e))
    })

  discoveryCache.set(discoveryUrl, p)
  return p
}

export async function loadBridgeContract(
  origin: string,
  contractEndpoint?: string,
): Promise<DevToVueBridgeContract> {
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

export async function ensureBridgeInit(origin: string, contract: DevToVueBridgeContract) {
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

export interface VueEntryResolutionResult {
  success: true
  entryUrl: string
}

export interface VueEntryResolutionError {
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

export type VueEntryResolution = VueEntryResolutionResult | VueEntryResolutionError

export async function resolveVueEntry(
  origin: string,
  componentName: string,
  contractEndpoint?: string,
): Promise<VueEntryResolution> {
  try {
    const contract = await loadBridgeContract(origin, contractEndpoint)
    const dev = contract?.dev || {}
    const componentMap = dev.componentMap || {}

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
              `import { devToVuePlugin } from '@dev-to/vue-plugin'`,
              '',
              `// Option 1: Shorthand (Default)`,
              `devToVuePlugin('${componentName}')`,
              '',
              `// Option 2: Explicit Mapping`,
              `devToVuePlugin({`,
              `  '${componentName}': '/', // Default entry`,
              `  'Other': 'src/Card.vue' // Specific file`,
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

export async function resolveVueEntryForLoader(
  origin: string,
  componentName: string,
  contractEndpoint?: string,
): Promise<
  { success: true, entryUrl: string }
  | { success: false, loaderError: VueLoaderError }
> {
  const r = await resolveVueEntry(origin, componentName, contractEndpoint)
  if (r.success) return r

  const e = (r as VueEntryResolutionError).error
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

interface VueLoaderState {
  isReady: boolean
  error: Error | VueLoaderError | null
}

export interface VueLoaderError {
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

export interface VueLoaderProps<P extends Record<string, unknown> = Record<string, unknown>> {
  origin?: string
  name?: string
  url?: string
  contractEndpoint?: string
  componentProps?: P
  loading?: () => VNodeChild
  externalError?: VueLoaderError | null
  renderError?: (error: Error | VueLoaderError) => VNodeChild
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

function syncProps(target: Record<string, unknown>, next: Record<string, unknown>) {
  for (const key of Object.keys(target)) {
    if (!(key in next)) delete target[key]
  }
  for (const [key, value] of Object.entries(next)) {
    target[key] = value
  }
}

export const VueLoader = defineComponent({
  name: 'VueLoader',
  props: {
    origin: { type: String, default: undefined },
    name: { type: String, default: undefined },
    url: { type: String, default: undefined },
    contractEndpoint: { type: String, default: undefined },
    componentProps: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
    loading: { type: Function as PropType<() => VNodeChild>, default: undefined },
    externalError: { type: Object as PropType<VueLoaderError | null>, default: null },
    renderError: { type: Function as PropType<(error: Error | VueLoaderError) => VNodeChild>, default: undefined },
  },
  setup(props): () => VNodeChild {
    const containerRef = ref<HTMLElement | null>(null)
    const appRef = ref<ReturnType<RemoteVueRuntime['createApp']> | null>(null)
    const runtimeRef = ref<RemoteVueRuntime | null>(null)
    const componentRef = ref<Component | null>(null)
    const propsStateRef = ref<Record<string, unknown> | null>(null)

    const state = ref<VueLoaderState>({ isReady: false, error: null })
    const version = ref(0)
    const resolvedUrl = ref<string | undefined>(props.url)
    const fullReloadListenerRef = ref<{ eventName: string, handler: () => void } | null>(null)

    const ensureFullReloadListener = (eventName: string) => {
      if (!eventName || typeof window === 'undefined') return
      const current = fullReloadListenerRef.value
      if (current?.eventName === eventName) return
      if (current) {
        window.removeEventListener(current.eventName, current.handler)
      }

      const handler = () => {
        version.value += 1
      }
      window.addEventListener(eventName, handler)
      fullReloadListenerRef.value = { eventName, handler }
    }

    const unmountRemoteApp = () => {
      try {
        appRef.value?.unmount?.()
      }
      catch {
        // ignore
      }
      appRef.value = null
      propsStateRef.value = null
    }

    const renderRemoteApp = (force = false) => {
      const runtime = runtimeRef.value
      const ComponentRef = componentRef.value
      if (!runtime || !ComponentRef) return
      if (!containerRef.value) return

      if (appRef.value && !force) return
      unmountRemoteApp()

      const propsState = runtime.reactive({}) as Record<string, unknown>
      syncProps(propsState, props.componentProps ?? {})

      const Wrapper = runtime.defineComponent({
        name: 'DevToVueWrapper',
        setup() {
          return () => runtime.h(ComponentRef, propsState)
        },
      })

      const app = runtime.createApp(Wrapper)
      app.mount(containerRef.value)

      appRef.value = app
      propsStateRef.value = propsState
      state.value.isReady = true
    }

    const loadViteComponent = async (
      entryUrl: string,
      exportName: string | undefined,
      currentVersion: number,
    ) => {
      if (!entryUrl) throw new Error('Not found entry url.')

      const originFromUrl = getOriginFromFinalJsUrl(entryUrl)
      const connector = entryUrl.includes('?') ? '&' : '?'
      const jsUrlWithParam
        = currentVersion > 0 ? `${entryUrl}${connector}v=${currentVersion}` : entryUrl

      try {
        const contract = await loadBridgeContract(originFromUrl, props.contractEndpoint)
        await ensureBridgeInit(originFromUrl, contract)
        ensureFullReloadListener(contract.events.fullReload)

        const runtimeModule = await nativeImport(`${originFromUrl}${contract.paths.vueRuntime}`)
        const runtime = resolveRemoteRuntime(runtimeModule)

        const moduleNs = await nativeImport(jsUrlWithParam)
        const moduleRecord = isRecord(moduleNs) ? moduleNs : {}

        const exportCandidate = exportName ? moduleRecord[exportName] : undefined
        const candidate = exportName
          ? exportCandidate ?? moduleRecord['default'] ?? moduleNs
          : moduleRecord['default'] ?? moduleNs
        const ComponentValue = unwrapDefault(candidate)

        if (ComponentValue) return { Component: ComponentValue as Component, runtime }
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
    }

    watch(
      () => [props.url, props.origin, props.name, props.contractEndpoint] as const,
      (values, _old, onInvalidate) => {
        const [directUrl, origin, name, contractEndpoint] = values
        let cancelled = false
        onInvalidate(() => {
          cancelled = true
        })

        if (directUrl) {
          resolvedUrl.value = directUrl
          state.value.error = null
          return
        }

        if (!origin || !name) {
          if (!directUrl && (origin || name)) {
            state.value.error = new Error('Missing dev server origin or component name for resolution.')
          }
          return
        }

        state.value.isReady = false
        state.value.error = null

        resolveVueEntryForLoader(origin, name, contractEndpoint).then((res) => {
          if (cancelled) return
          if (res.success === true) {
            resolvedUrl.value = res.entryUrl
          }
          else {
            state.value.error = res.loaderError
          }
        })
      },
      { immediate: true },
    )

    watch(
      () => [resolvedUrl.value, props.name, version.value] as const,
      (values, _old, onInvalidate) => {
        const [url, name, currentVersion] = values
        if (!url) return

        let cancelled = false
        onInvalidate(() => {
          cancelled = true
        })

        state.value.isReady = false
        if (state.value.error instanceof Error) state.value.error = null

        loadViteComponent(url, name, currentVersion)
          .then(({ Component, runtime }) => {
            if (cancelled) return
            runtimeRef.value = runtime
            componentRef.value = Component
            renderRemoteApp(true)
          })
          .catch((err) => {
            if (cancelled) return
            state.value.error = err instanceof Error ? err : new Error(String(err))
            state.value.isReady = false
            unmountRemoteApp()
          })
      },
      { immediate: true },
    )

    watch(
      () => props.componentProps,
      (next) => {
        if (!propsStateRef.value) return
        syncProps(propsStateRef.value, (next || {}) as Record<string, unknown>)
      },
      { deep: true },
    )

    onMounted(() => {
      renderRemoteApp(false)
    })

    onBeforeUnmount(() => {
      unmountRemoteApp()
      if (typeof window === 'undefined') return
      const current = fullReloadListenerRef.value
      if (current) {
        window.removeEventListener(current.eventName, current.handler)
      }
    })

    const renderErrorNode = (err: Error | VueLoaderError) => {
      if (props.renderError) return props.renderError(err)
      const isLoaderErrorObject = !(err instanceof Error)
      const message = err.message || String(err)
      const currentOrigin
        = (isLoaderErrorObject ? err.origin : undefined)
          || props.origin
          || (props.url ? getOriginFromFinalJsUrl(props.url) : '')

      const debugPanelUrl = `${currentOrigin}${DEV_TO_DEBUG_HTML_PATH}`

      return h('div', { style: { border: '1px solid #e5e7eb', padding: '10px', borderRadius: '6px' } }, [
        h('div', { style: { fontWeight: '600', marginBottom: '6px' } }, 'DevTo Vue Loader Error'),
        h('pre', { style: { fontSize: '12px', whiteSpace: 'pre-wrap' } }, message),
        currentOrigin
          ? h('div', { style: { fontSize: '12px', marginTop: '6px' } }, [
              h('span', 'Origin: '),
              h('code', currentOrigin),
            ])
          : null,
        currentOrigin
          ? h('div', { style: { fontSize: '12px', marginTop: '6px' } }, [
              h('a', { href: debugPanelUrl, target: '_blank', rel: 'noreferrer' }, debugPanelUrl),
            ])
          : null,
      ])
    }

    return () => {
      if (props.externalError) {
        return renderErrorNode(props.externalError)
      }
      if (state.value.error) {
        return renderErrorNode(state.value.error)
      }

      const children: VNodeChild[] = [
        h('div', { 'ref': containerRef, 'class': 'vdev-loader-container', 'data-is': 'VueLoader' }),
      ]

      if (!state.value.isReady) {
        const loadingNode = props.loading ? props.loading() : h('div', 'Loading...')
        children.push(loadingNode)
      }

      return h('div', { class: 'vdev-loader-root' }, children)
    }
  },
})
