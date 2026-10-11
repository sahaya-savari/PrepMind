/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Manrope', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        midnight: {
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          elevated: 'var(--surface-elevated)',
          subtle: 'var(--surface-subtle)',
          border: 'var(--border)',
          accent: 'var(--accent)',
          accentHover: 'var(--accent-hover)',
          accentSoft: 'var(--accent-soft)',
          positive: 'var(--positive)',
          warning: 'var(--warning)',
          error: 'var(--error)',
          info: 'var(--info)',
        },
        ink: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.25)',
        elevated: '0 12px 32px -4px rgba(0, 0, 0, 0.35)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
    },
  },
  plugins: [],
};
