/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f3f6fb', 100: '#e4eaf5', 200: '#c8d3ea', 300: '#9fb0d6', 400: '#6f86bd',
          500: '#4d65a3', 600: '#3a4f87', 700: '#2d3e6c', 800: '#1d2a4d', 900: '#121c36', 950: '#0b1226',
        },
        brand: {
          50: '#eef4ff', 100: '#dbe7ff', 200: '#bdd3ff', 300: '#90b5ff', 400: '#5e8dfb',
          500: '#3a68f2', 600: '#2550dc', 700: '#1d3fb4', 800: '#1d378f', 900: '#1d3271',
        },
        ink: { DEFAULT: '#0f172a', muted: '#475569', subtle: '#64748b' },
      },
      fontFamily: {
        sans: ['"Inter var"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Inter var"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px -4px rgba(15,23,42,.08)',
        lift: '0 2px 4px rgba(15,23,42,.05), 0 16px 32px -12px rgba(15,23,42,.18)',
      },
      maxWidth: { site: '76rem' },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
      },
      animation: { 'fade-in': 'fade-in .2s ease-out', 'slide-in': 'slide-in .22s ease-out' },
    },
  },
  plugins: [],
};
