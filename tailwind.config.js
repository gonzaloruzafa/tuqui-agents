/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'adhoc-violet': '#667eea',
        'adhoc-coral': '#f093fb',
        'adhoc-lavender': '#e9e4f0',
      },
      fontFamily: {
        'display': ['"New Kansas"', 'system-ui', 'sans-serif'],
        'sans': ['"Apercu Pro"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
