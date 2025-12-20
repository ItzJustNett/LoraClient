/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#09090b',
          900: '#0c0c0e',
          850: '#0f0f12',
          800: '#131316',
          700: '#18181b',
          600: '#1f1f23',
          500: '#27272a',
          400: '#3f3f46',
          300: '#52525b',
          200: '#71717a',
          100: '#a1a1aa',
        },
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          muted: '#1d4ed8',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.4)',
      },
      transitionDuration: {
        '150': '150ms',
      },
    },
  },
  plugins: [],
};