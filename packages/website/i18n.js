import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

const translations = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

// Detect language: LocalStorage -> Browser UA -> Default (zh-CN)
function getInitialLanguage() {
  const savedLang = localStorage.getItem('lang')
  if (savedLang) return savedLang

  const uaLang = navigator.language || navigator.userLanguage
  if (uaLang && uaLang.toLowerCase().startsWith('zh')) {
    return 'zh-CN'
  }
  return 'en-US'
}

let currentLang = getInitialLanguage()

export function getTranslation(key) {
  const t = translations[currentLang]
  return getNestedValue(t, key)
}

function getNestedValue(obj, path) {
  const parts = path.split('.')
  let current = obj

  // Try progressively longer key combinations
  for (let i = 0; i < parts.length; i++) {
    if (!current) return undefined

    // Try remaining parts as a single flat key (e.g., "dx.setup")
    const remainingKey = parts.slice(i).join('.')
    if (current[remainingKey] !== undefined) {
      return current[remainingKey]
    }

    // Otherwise, navigate one level deeper
    current = current[parts[i]]
  }

  return current
}

export function setLanguage(lang) {
  if (!translations[lang]) return
  currentLang = lang
  localStorage.setItem('lang', lang)
  updateContent()
  updateActiveButton()
  document.documentElement.lang = lang
}

export function toggleLanguage() {
  const newLang = currentLang === 'zh-CN' ? 'en-US' : 'zh-CN'
  setLanguage(newLang)
}

function updateContent() {
  const t = translations[currentLang]

  // Update text content
  const elements = document.querySelectorAll('[data-i18n]')
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n')
    const value = getNestedValue(t, key)

    if (value) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = value
      }
      else if (el.tagName === 'text' || el.namespaceURI === 'http://www.w3.org/2000/svg') {
        // SVG elements need textContent
        el.textContent = value
      }
      else {
        // Support HTML in translations (e.g. for gradient text or emphasis)
        el.innerHTML = value
      }
    }
  })

  // Update title attributes
  const titleElements = document.querySelectorAll('[data-i18n-title]')
  titleElements.forEach((el) => {
    const key = el.getAttribute('data-i18n-title')
    const value = getNestedValue(t, key)
    if (value) {
      el.setAttribute('title', value)
      el.setAttribute('aria-label', value)
    }
  })
}

function updateActiveButton() {
  const switchBtn = document.querySelector('.lang-switch')
  if (switchBtn) {
    switchBtn.textContent = currentLang === 'zh-CN' ? 'English' : '中文'
  }
}

export function initI18n() {
  // Initial render
  updateContent()
  updateActiveButton()
  document.documentElement.lang = currentLang

  // Bind click event to switcher if exists
  const switcher = document.querySelector('.lang-switch')
  if (switcher) {
    switcher.addEventListener('click', toggleLanguage)
  }
}
