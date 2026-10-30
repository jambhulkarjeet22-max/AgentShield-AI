/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070B14',
          900: '#0B1120',
          850: '#0F172A',
          800: '#15203B',
          700: '#1E2D4A',
          600: '#2A3C5E',
        },
        electric: {
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          blue: '#2563EB',
          glow: '#3B82F6',
        },
      },
    },
  },
  plugins: [],
}

