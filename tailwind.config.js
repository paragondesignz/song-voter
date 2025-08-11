/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Noto Sans", "Ubuntu", "Cantarell", "Helvetica Neue", "Arial", "sans-serif"],
        heading: ["Poppins", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Noto Sans", "Ubuntu", "Cantarell", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        spotify: {
          green: '#1DB954',
          black: '#191414',
          white: '#FFFFFF',
        },
        primary: {
          50:  '#EEF6FF',
          100: '#D9ECFF',
          200: '#BBDDFF',
          300: '#8FC6FF',
          400: '#5EABFF',
          500: '#2E92FF',
          600: '#0A84FF',
          700: '#086AD1',
          800: '#0757AB',
          900: '#064485',
          950: '#042E5C',
        },
        secondary: {
          50:  '#FFF0F4',
          100: '#FFE0E8',
          200: '#FFB8CA',
          300: '#FF8EAA',
          400: '#FF6B91',
          500: '#FF4A79',
          600: '#FF3366',
          700: '#D62B58',
          800: '#B2244A',
          900: '#8E1C3B',
          950: '#611228',
        },
        accent: {
          DEFAULT: '#FFD60A',
        },
        surface: '#FFFFFF',
        background: '#F9FAFB',
      },
      animation: {
        'vote': 'vote 0.5s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        vote: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'soft': '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.08)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
}