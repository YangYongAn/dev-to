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

    // Update active state on menu options
    updateActiveOption(theme)
  }

  function updateActiveOption(theme) {
    const options = document.querySelectorAll('.theme-option')
    options.forEach((option) => {
      if (option.getAttribute('data-theme') === theme) {
        option.classList.add('active')
      }
      else {
        option.classList.remove('active')
      }
    })
  }

  // Initialize theme on page load (before DOMContentLoaded to prevent flash)
  const initialTheme = getStoredTheme() || 'auto'
  setTheme(initialTheme)

  // Bind theme menu interactions
  document.addEventListener('DOMContentLoaded', () => {
    const themeWrapper = document.querySelector('.theme-switch-wrapper')
    const themeSwitchBtn = document.querySelector('.theme-switch')
    const themeOptions = document.querySelectorAll('.theme-option')

    // Toggle menu on button click
    if (themeSwitchBtn && themeWrapper) {
      themeSwitchBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        themeWrapper.classList.toggle('active')
      })

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!themeWrapper.contains(e.target)) {
          themeWrapper.classList.remove('active')
        }
      })
    }

    // Handle theme option selection
    themeOptions.forEach((option) => {
      option.addEventListener('click', () => {
        const theme = option.getAttribute('data-theme')
        if (theme) {
          setTheme(theme)
        }
        if (themeWrapper) {
          themeWrapper.classList.remove('active')
        }
      })
    })

    // Update active option on initial load
    updateActiveOption(getStoredTheme() || 'auto')
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
