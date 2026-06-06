/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':       '#0A0A0F',
        'bg-secondary':     '#12121A',
        'bg-tertiary':      '#1A1A26',
        'accent-primary':   '#6C63FF',
        'accent-secondary': '#00D4AA',
        'accent-danger':    '#FF4757',
        'accent-warning':   '#FFA502',
        'text-primary':     '#FFFFFF',
        'text-secondary':   '#A0A0B8',
        'text-muted':       '#5A5A72',
        'border-color':     '#2A2A3A',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderColor: {
        DEFAULT: '#2A2A3A',
      },
    },
  },
  plugins: [],
}
