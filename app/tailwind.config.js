/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', '"DM Sans"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f7f7fb',
          100: '#ececf3',
          200: '#d9d9e3',
          300: '#b3b3c3',
          400: '#8c8ca4',
          500: '#666684',
          600: '#4d4d66',
          700: '#38384d',
          800: '#232333',
          900: '#131320',
        },
        accent: {
          50: '#f0f8ff',
          100: '#d6edff',
          200: '#a8d9ff',
          300: '#7dc5ff',
          400: '#4fb0ff',
          500: '#1f9cff',
          600: '#0d7ed6',
          700: '#0763a8',
          800: '#054a7d',
          900: '#033255',
        },
        highlight: '#f6c344',
      },
      boxShadow: {
        card: '0 20px 60px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        xl: '1.25rem',
      },
    },
  },
  plugins: [],
};
