// Theme Switcher
(function () {
  const THEME_KEY = 'dev-to-theme'

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }

  function getTheme() {
    const stored = localStorage.getItem(THEME_KEY)
    return stored || getSystemTheme()
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }

  function toggleTheme() {
    const current = getTheme()
    const next = current === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  // Initialize theme on page load (before DOMContentLoaded to prevent flash)
  setTheme(getTheme())

  // Bind theme switch button
  document.addEventListener('DOMContentLoaded', () => {
    const themeSwitchBtn = document.querySelector('.theme-switch')
    if (themeSwitchBtn) {
      themeSwitchBtn.addEventListener('click', toggleTheme)
    }
  })

  // Listen to system theme changes
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    // Only update if user hasn't set a preference
    if (!localStorage.getItem(THEME_KEY)) {
      setTheme(e.matches ? 'light' : 'dark')
    }
  })
})()
