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
