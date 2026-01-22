// Theme Switcher
(function () {
  const THEME_KEY = 'dev-to-theme'

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }

  function getStoredTheme() {
    return localStorage.getItem(THEME_KEY) // 'light' | 'dark' | 'auto' | null
  }

  function setTheme(theme) {
    // theme can be 'light', 'dark', or 'auto'
    localStorage.setItem(THEME_KEY, theme)

    const effectiveTheme = theme === 'auto' ? getSystemTheme() : theme
    document.documentElement.setAttribute('data-theme', effectiveTheme)
    document.documentElement.setAttribute('data-theme-setting', theme)
  }

  function toggleTheme() {
    const current = getStoredTheme() || 'auto'
    let next

    // Cycle: dark → light → auto → dark
    if (current === 'dark') {
      next = 'light'
    }
    else if (current === 'light') {
      next = 'auto'
    }
    else { // 'auto' or null
      next = 'dark'
    }

    setTheme(next)
  }

  // Initialize theme on page load (before DOMContentLoaded to prevent flash)
  const initialTheme = getStoredTheme() || 'auto'
  setTheme(initialTheme)

  // Bind theme switch button
  document.addEventListener('DOMContentLoaded', () => {
    const themeSwitchBtn = document.querySelector('.theme-switch')
    if (themeSwitchBtn) {
      themeSwitchBtn.addEventListener('click', toggleTheme)
    }
  })

  // Listen to system theme changes (only when theme is set to 'auto')
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    const stored = getStoredTheme()
    if (stored === 'auto' || stored === null) {
      const effectiveTheme = e.matches ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', effectiveTheme)
    }
  })
})()
