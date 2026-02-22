import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B3A5C',
          50: '#E8EDF3',
          100: '#D1DBE7',
          200: '#A3B7CF',
          300: '#7593B7',
          400: '#476F9F',
          500: '#1B3A5C',
          600: '#162E4A',
          700: '#112337',
          800: '#0B1725',
          900: '#060C12',
        },
        secondary: {
          DEFAULT: '#007A4D',
          50: '#E6F5EF',
          100: '#CCEBDF',
          200: '#99D7BF',
          300: '#66C39F',
          400: '#33AF7F',
          500: '#007A4D',
          600: '#00623E',
          700: '#00492E',
          800: '#00311F',
          900: '#00180F',
        },
        accent: {
          DEFAULT: '#FFB81C',
          text: '#996E00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      maxWidth: {
        content: '640px',
      },
    },
  },
  plugins: [],
} satisfies Config

