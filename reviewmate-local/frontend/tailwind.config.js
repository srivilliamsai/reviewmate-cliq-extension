/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'rm-bg': '#0b1120',
        'rm-card': '#111c2f',
        'rm-accent': '#38bdf8'
      }
    }
  },
  plugins: []
};
