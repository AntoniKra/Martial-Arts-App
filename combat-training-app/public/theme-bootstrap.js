;(function () {
  var storedTheme = null
  try {
    storedTheme = localStorage.getItem('combat-training.theme')
  } catch (error) {
    // An unavailable preference must not prevent using the system theme.
  }
  var systemTheme =
    typeof window.matchMedia === 'function' && !window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'light'
      : 'dark'
  var theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : systemTheme
  document.documentElement.setAttribute('data-theme', theme)
  var themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', theme === 'light' ? '#F1F1EF' : '#0B0B0D')
  }
})()
