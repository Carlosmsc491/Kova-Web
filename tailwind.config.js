/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':       'var(--color-bg-primary)',
        'bg-secondary':     'var(--color-bg-secondary)',
        'bg-tertiary':      'var(--color-bg-tertiary)',
        'accent-primary':   'var(--color-accent-primary)',
        'accent-secondary': 'var(--color-accent-secondary)',
        'accent-danger':    'var(--color-accent-danger)',
        'accent-warning':   'var(--color-accent-warning)',
        'text-primary':     'var(--color-text-primary)',
        'text-secondary':   'var(--color-text-secondary)',
        'text-muted':       'var(--color-text-muted)',
        'border-color':     'var(--color-border)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderColor: {
        DEFAULT: 'var(--color-border)',
      },
    },
  },
  plugins: [],
}
