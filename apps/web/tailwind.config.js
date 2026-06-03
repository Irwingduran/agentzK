/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
      },
      colors: {
        ink: { DEFAULT: '#0d0d0d', 2: '#444441', 3: '#888780' },
        amber: { DEFAULT: '#BA7517', light: '#FAEEDA', mid: '#FAC775' },
        green: { DEFAULT: '#3B6D11', light: '#EAF3DE' },
        blue: { DEFAULT: '#185FA5', light: '#E6F1FB' },
      },
    },
  },
  plugins: [],
};
