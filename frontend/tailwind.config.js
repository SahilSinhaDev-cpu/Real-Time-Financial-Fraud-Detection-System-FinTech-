/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-charcoal': '#0B0C10',
        'obsidian': '#1F2833',
        'cyan-secondary': '#45A29E',
        'electric-cyan': '#66FCF1',
        'light-gray': '#C5C6C7',
      },
      fontFamily: {
        'mono': ['"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'cyan-glow': '0 0 8px 2px rgba(102, 252, 241, 0.5)',
        'red-glow': '0 0 8px 2px rgba(239, 68, 68, 0.5)',
      }
    },
  },
  plugins: [],
}