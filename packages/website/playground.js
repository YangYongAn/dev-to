// playground.js - Playground 核心逻辑

const DEV_SERVER_CANDIDATES = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]
const DISCOVERY_PATH = '/__dev_to__/discovery.json'
const POLL_INTERVAL = 3000

// HMR 事件名称映射
const HMR_EVENTS = {
  react: ['dev_to:react:full-reload', 'dev_to:react:hmr-update'],
  vue: ['dev_to:vue:full-reload', 'dev_to:vue:hmr-update'],
}

// 全局状态
let pollTimer = null
let currentOrigin = null
let currentFramework = null
let currentComponent = null
let hmrCount = 0
let hmrListenersAttached = false

// DOM 元素引用
let elements = {}

/**
 * 初始化
 */
function init() {
  // 获取 DOM 元素引用
  elements = {
    connectionDot: document.getElementById('connection-dot'),
    connectionText: document.getElementById('connection-text'),
    connectionInfo: document.getElementById('connection-info'),
    waitingMessage: document.getElementById('waiting-message'),
    serverOrigin: document.getElementById('server-origin'),
    frameworkInfo: document.getElementById('framework-info'),
    frameworkVersion: document.getElementById('framework-version'),
    componentSection: document.getElementById('component-section'),
    componentList: document.getElementById('component-list'),
    propsSection: document.getElementById('props-section'),
    propsJson: document.getElementById('props-json'),
    applyPropsBtn: document.getElementById('apply-props'),
    resetPropsBtn: document.getElementById('reset-props'),
    hmrSection: document.getElementById('hmr-section'),
    hmrLog: document.getElementById('hmr-log'),
    perfSection: document.getElementById('perf-section'),
    perfReloadTime: document.getElementById('perf-reload-time'),
    perfHmrCount: document.getElementById('perf-hmr-count'),
    componentSelect: document.getElementById('component-select'),
    reloadBtn: document.getElementById('reload-btn'),
    playgroundIframe: document.getElementById('playground-iframe'),
    loadingOverlay: document.getElementById('loading-overlay'),
  }

  // 绑定事件监听器
  elements.applyPropsBtn.addEventListener('click', applyProps)
  elements.resetPropsBtn.addEventListener('click', resetProps)
  elements.reloadBtn.addEventListener('click', reloadIframe)
  elements.componentSelect.addEventListener('change', onComponentChange)

  // 设置 iframe 通信
  setupIframeCommunication()

  // 设置复制按钮
  setupCopyButtons()

  // 开始轮询检测开发服务器
  startPolling()
}

/**
 * 检测开发服务器
 */
async function detectDevServer() {
  for (const origin of DEV_SERVER_CANDIDATES) {
    try {
      const resp = await fetch(`${origin}${DISCOVERY_PATH}`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
      })
      if (resp.ok) {
        const discovery = await resp.json()
        return { origin, discovery }
      }
    }
    catch {
      // Continue to next candidate
    }
  }
  return null
}

/**
 * 开始轮询
 */
function startPolling() {
  stopPolling()
  const poll = async () => {
    const result = await detectDevServer()
    if (result) {
      await onServerDetected(result.origin, result.discovery)
      // 连接成功后停止轮询
    }
    else {
      // 连接失败，继续轮询
      updateConnectionStatus('disconnected')
      pollTimer = setTimeout(poll, POLL_INTERVAL)
    }
  }
  poll()
}

/**
 * 停止轮询
 */
function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

/**
 * 服务器检测成功处理
 */
async function onServerDetected(origin, discovery) {
  console.log('[Playground] Dev server detected:', origin, discovery)

  currentOrigin = origin

  // 检测框架
  try {
    currentFramework = detectFramework(discovery)
    updateConnectionStatus('connected')
    updateServerInfo(origin, currentFramework)
    renderComponentList(discovery.components)
    setupHMREventListeners(currentFramework.type)

    // 显示各个 section
    elements.componentSection.style.display = 'block'
    elements.propsSection.style.display = 'block'
    elements.hmrSection.style.display = 'block'
    elements.perfSection.style.display = 'block'

    // 启用工具栏
    elements.componentSelect.disabled = false
    elements.reloadBtn.disabled = false

    // 加载默认组件
    const firstComponent = Object.keys(discovery.components)[0]
    if (firstComponent) {
      currentComponent = firstComponent
      loadComponent(firstComponent)
    }
  }
  catch (error) {
    console.error('[Playground] Framework detection failed:', error)
    updateConnectionStatus('error')
    showError(error.message)
  }
}

/**
 * 检测框架类型
 */
function detectFramework(discovery) {
  const frameworkType = discovery?.framework?.type
  const frameworkVersion = discovery?.framework?.version

  if (!frameworkType) {
    throw new Error('无法从 discovery 端点检测框架类型')
  }

  if (frameworkType !== 'react' && frameworkType !== 'vue') {
    throw new Error(`不支持的框架类型: ${frameworkType}`)
  }

  return {
    type: frameworkType,
    version: frameworkVersion || 'unknown',
  }
}

/**
 * 更新连接状态
 */
function updateConnectionStatus(status) {
  elements.connectionDot.setAttribute('data-status', status)

  if (status === 'connected') {
    elements.connectionText.textContent = '已连接'
    elements.connectionText.setAttribute('data-i18n', 'playground.connection.connected')
    elements.waitingMessage.style.display = 'none'
    elements.connectionInfo.style.display = 'block'
  }
  else if (status === 'connecting') {
    elements.connectionText.textContent = '连接中...'
    elements.connectionText.setAttribute('data-i18n', 'playground.connection.connecting')
  }
  else if (status === 'disconnected') {
    elements.connectionText.textContent = '未连接'
    elements.connectionText.setAttribute('data-i18n', 'playground.connection.disconnected')
    elements.waitingMessage.style.display = 'block'
    elements.connectionInfo.style.display = 'none'
  }
  else if (status === 'error') {
    elements.connectionText.textContent = '检测失败'
    elements.connectionText.setAttribute('data-i18n', 'playground.errors.detection_failed')
  }
}

/**
 * 更新服务器信息
 */
function updateServerInfo(origin, framework) {
  elements.serverOrigin.textContent = origin
  elements.frameworkInfo.textContent = framework.type.charAt(0).toUpperCase() + framework.type.slice(1)
  elements.frameworkVersion.textContent = framework.version
}

/**
 * 渲染组件列表
 */
function renderComponentList(components) {
  elements.componentList.innerHTML = ''
  elements.componentSelect.innerHTML = '<option value="">选择组件...</option>'

  if (!components || Object.keys(components).length === 0) {
    elements.componentList.innerHTML = '<p class="component-empty" data-i18n="playground.components.empty">未发现组件配置</p>'
    return
  }

  Object.entries(components).forEach(([name, info]) => {
    // 添加到列表
    const item = document.createElement('div')
    item.className = 'component-item'
    item.dataset.componentName = name
    item.innerHTML = `
      <div class="component-name">${name}</div>
      <div class="component-entry">${info.entry || '/'}</div>
    `
    item.addEventListener('click', () => {
      document.querySelectorAll('.component-item').forEach(el => el.classList.remove('active'))
      item.classList.add('active')
      loadComponent(name)
    })
    elements.componentList.appendChild(item)

    // 添加到下拉框
    const option = document.createElement('option')
    option.value = name
    option.textContent = name
    elements.componentSelect.appendChild(option)
  })

  // 默认选中第一个
  const firstItem = elements.componentList.querySelector('.component-item')
  if (firstItem) {
    firstItem.classList.add('active')
  }
}

/**
 * 加载组件到 iframe
 */
function loadComponent(componentName) {
  if (!currentOrigin || !currentFramework) return

  currentComponent = componentName
  elements.componentSelect.value = componentName

  // 显示加载状态
  elements.loadingOverlay.style.display = 'flex'

  const frameworkType = currentFramework.type
  const iframeUrl = `/playground/${frameworkType}-frame.html?origin=${encodeURIComponent(currentOrigin)}&name=${encodeURIComponent(componentName)}`

  console.log('[Playground] Loading iframe:', iframeUrl)
  elements.playgroundIframe.src = iframeUrl

  // 记录重载时间
  const reloadTime = new Date().toLocaleTimeString()
  elements.perfReloadTime.textContent = reloadTime
}

/**
 * 组件选择变化
 */
function onComponentChange(e) {
  const componentName = e.target.value
  if (componentName) {
    loadComponent(componentName)
  }
}

/**
 * 重新加载 iframe
 */
function reloadIframe() {
  if (currentComponent) {
    loadComponent(currentComponent)
  }
}

/**
 * 设置 HMR 事件监听
 */
function setupHMREventListeners(frameworkType) {
  if (hmrListenersAttached) return

  const events = HMR_EVENTS[frameworkType] || []

  events.forEach((eventName) => {
    window.addEventListener(eventName, (e) => {
      logHMREvent(eventName, e.detail)
      hmrCount++
      elements.perfHmrCount.textContent = hmrCount
    })
  })

  hmrListenersAttached = true
}

/**
 * 记录 HMR 事件
 */
function logHMREvent(eventName) {
  const logEmpty = elements.hmrLog.querySelector('.log-empty')
  if (logEmpty) {
    logEmpty.remove()
  }

  const logEntry = document.createElement('div')
  logEntry.className = 'log-entry'
  logEntry.innerHTML = `
    <span class="log-time">${new Date().toLocaleTimeString()}</span>
    <span class="log-event">${eventName}</span>
  `
  elements.hmrLog.prepend(logEntry)

  // 保持最多 50 条记录
  while (elements.hmrLog.children.length > 50) {
    elements.hmrLog.removeChild(elements.hmrLog.lastChild)
  }
}

/**
 * 应用 Props
 */
function applyProps() {
  try {
    const propsText = elements.propsJson.value
    const props = JSON.parse(propsText)

    // 发送到 iframe
    if (elements.playgroundIframe.contentWindow) {
      elements.playgroundIframe.contentWindow.postMessage({
        type: 'dev-to:update-props',
        props,
      }, '*')
      console.log('[Playground] Props sent to iframe:', props)
    }
  }
  catch (error) {
    alert('JSON 格式无效: ' + error.message)
  }
}

/**
 * 重置 Props
 */
function resetProps() {
  elements.propsJson.value = '{"title": "Hello World"}'
}

/**
 * 设置 iframe 通信
 */
function setupIframeCommunication() {
  window.addEventListener('message', (event) => {
    const data = event.data

    if (data?.type === 'dev-to:component-ready') {
      console.log('[Playground] Component ready:', data.componentName)
      elements.loadingOverlay.style.display = 'none'
    }
    else if (data?.type === 'dev-to:hmr-event') {
      console.log('[Playground] HMR event from iframe:', data)
      logHMREvent(data.eventName)
    }
    else if (data?.type === 'dev-to:error') {
      console.error('[Playground] Error from iframe:', data.error)
      showError(data.error)
    }
  })

  // iframe 加载完成
  elements.playgroundIframe.addEventListener('load', () => {
    console.log('[Playground] Iframe loaded')
  })
}

/**
 * 显示错误
 */
function showError(message) {
  elements.loadingOverlay.innerHTML = `
    <div class="error-message">
      <h3>加载失败</h3>
      <p>${message}</p>
      <button onclick="location.reload()" class="btn btn-primary">重新加载</button>
    </div>
  `
  elements.loadingOverlay.style.display = 'flex'
}

/**
 * 设置复制按钮
 */
function setupCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const code = btn.getAttribute('data-code')
      if (!code) return

      try {
        await navigator.clipboard.writeText(code)

        // 显示复制成功状态
        btn.classList.add('copied')
        const originalHTML = btn.innerHTML
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `

        setTimeout(() => {
          btn.classList.remove('copied')
          btn.innerHTML = originalHTML
        }, 2000)
      }
      catch (err) {
        console.error('Failed to copy:', err)
      }
    })
  })
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
}
else {
  init()
}
