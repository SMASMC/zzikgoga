// tailwind.config.js
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    'node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}',
    'node_modules/flowbite/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        main: {
          500: '#1E40AF',
          600: '#1D398D',
          700: '#1C3383',
          800: '#1B2D7A',
          900: '#1A2771',
          950: '#192168',
        },
        point: {
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        hover: {
          500: '#7DD3FC',
          600: '#60A5FA',
          700: '#4F9CF2',
          800: '#4388E6',
          900: '#3B82F6',
          950: '#3072D6',
        },
        background: {
          500: '#CFF3FF',
          600: '#B3E5FD',
          700: '#93D5FD',
          800: '#72C5FD',
          900: '#51B5FD',
          950: '#30A5FD',
        },
        text: {
          500: '#0A0F1A',
          600: '#1D398D',
          700: '#1C3383',
          800: '#1B2D7A',
          900: '#1A2771',
          950: '#192168',
        },
      },
      fontFamily: {
        bmjua: ['BMJUA', 'Apple SD Gothic Neo', 'Noto Sans KR', 'system-ui', 'sans-serif'],
        sans: ['BMJUA', 'Apple SD Gothic Neo', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('flowbite/plugin')],
}
