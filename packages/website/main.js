import { initI18n, getTranslation } from './i18n.js'

// Initialize i18n
initI18n()

// Display version info in console and footer
/* global __VERSION_INFO__ */
function displayVersionInfo() {
  const versionInfo = __VERSION_INFO__

  // Display in console
  console.log(
    `%cdev-to %c${versionInfo.version}`,
    'color: #3fb950; font-weight: bold; font-size: 14px;',
    'color: #8b949e; font-size: 14px;',
  )
  console.log(
    `%cGit: %c${versionInfo.gitBranch}@${versionInfo.gitHash}`,
    'color: #58a6ff;',
    'color: #8b949e;',
  )
  console.log(
    `%cBuild: %c${versionInfo.buildDate}`,
    'color: #79c0ff;',
    'color: #8b949e;',
  )
  console.log('')

  // Display in HTML
  const footer = document.querySelector('.footer-bottom')
  if (footer && footer.firstChild) {
    const versionElement = document.createElement('div')
    versionElement.style.cssText = `
      font-size: 0.7rem;
      color: #6e7681;
      margin-top: 12px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    `
    versionElement.innerHTML = `
      <span style="color: #3fb950; margin-right: 8px;">v${versionInfo.version}</span>
      <span style="color: #58a6ff; margin-right: 8px;">${versionInfo.gitBranch}@${versionInfo.gitHash}</span>
      <span style="color: #8b949e;">${versionInfo.buildDate}</span>
    `
    footer.appendChild(versionElement)
  }
}

// Copy command functionality

function copyCommand() {
  const command = document.getElementById('command').textContent
  const btn = document.querySelector('.copy-btn')

  navigator.clipboard.writeText(command).then(() => {
    btn.classList.add('copied')
    btn.querySelector('span').textContent = getTranslation('hero.copied')

    setTimeout(() => {
      btn.classList.remove('copied')
      btn.querySelector('span').textContent = getTranslation('hero.copy')
    }, 2000)
  })
}

function setupHeroCommandTabs() {
  const tabs = Array.from(document.querySelectorAll('.hero-command-tab'))
  const commandEl = document.getElementById('command')
  const copyBtn = document.querySelector('.copy-btn')

  if (!tabs.length || !commandEl) {
    return
  }

  const resetCopyState = () => {
    if (!copyBtn) return
    copyBtn.classList.remove('copied')
    const label = copyBtn.querySelector('span')
    if (label) {
      label.textContent = getTranslation('hero.copy')
    }
  }

  const activateTab = (tab) => {
    tabs.forEach((item) => {
      const active = item === tab
      item.classList.toggle('is-active', active)
      item.setAttribute('aria-selected', active ? 'true' : 'false')
      item.tabIndex = active ? 0 : -1
    })
    commandEl.textContent = tab.dataset.command || commandEl.textContent
    resetCopyState()
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab))
    tab.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        activateTab(tab)
      }
    })
  })

  const defaultTab = tabs.find(tab => tab.classList.contains('is-active')) || tabs[0]
  activateTab(defaultTab)
}

// Make copyCommand available globally
window.copyCommand = copyCommand

// Scroll animations
document.addEventListener('DOMContentLoaded', () => {
  // Display version info
  displayVersionInfo()

  // Hero command tabs
  setupHeroCommandTabs()

  // Add fade-in class to animated elements
  const animatedElements = document.querySelectorAll(
    '.pain-card, .feature-card, .scenario-card, .package-card, .step-card',
  )

  animatedElements.forEach((el) => {
    el.classList.add('fade-in')
  })

  // Intersection Observer for scroll animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    },
  )

  animatedElements.forEach(el => observer.observe(el))

  // Smooth scroll for navigation links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute('href'))
      if (target) {
        const navHeight = document.querySelector('.nav').offsetHeight
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        })
      }
    })
  })

  // Nav background on scroll
  const nav = document.querySelector('.nav')

  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      nav.style.background = 'rgba(10, 10, 15, 0.95)'
    }
    else {
      nav.style.background = 'rgba(10, 10, 15, 0.8)'
    }
  })
})
