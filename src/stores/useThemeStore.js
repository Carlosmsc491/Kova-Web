import { create } from 'zustand'

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('kova-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return 'dark'
}

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.add('light')
  } else {
    root.classList.remove('light')
  }
  try { localStorage.setItem('kova-theme', theme) } catch {}

  // black-translucent draws light status bar glyphs, which disappear
  // against a light-theme header — flip both together so the status bar
  // stays legible in either theme.
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#F5F5F8' : '#0A0A0F')
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', theme === 'light' ? 'default' : 'black-translucent')
}

// Apply on load
applyTheme(getInitialTheme())

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),

  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
  },

  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
}))
