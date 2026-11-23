/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ice: {
          DEFAULT: '#F4FAFF',
          50: '#FFFFFF',
          100: '#F4FAFF',
          200: '#E6F4FE',
          300: '#D5EDFD',
        },
        sky: {
          DEFAULT: '#BFE3FA',
          light: '#D7EEFC',
          dark: '#A6D7F8',
        },
        'ocean-soft': {
          DEFAULT: '#8EC5F5',
          light: '#A6D2F7',
          dark: '#73B4F1',
        },
        accent: {
          DEFAULT: '#6FB4F2',
          hover: '#5EA7E8',
          active: '#4A98DE',
          deep: '#1F6FC8',
        },
        ink: {
          DEFAULT: '#2B3A4A',
          light: '#3F4D5B',
          dark: '#1B2631',
        },
        muted: {
          DEFAULT: '#3F4D5B',
          light: '#5A6978',
          dark: '#2B3A4A',
        },
        status: {
          due: {
            bg: '#FFE3CF',
            text: '#8A4A1F',
          },
          overdue: {
            bg: '#FFD6D2',
            text: '#9B2C2C',
          },
          paid: {
            bg: '#CDEFE0',
            text: '#1F6B4F',
          },
          upcoming: {
            bg: '#FFFFFF',
            text: '#2B3A4A',
          },
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Noto Sans Tamil"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        ocean: '0 8px 24px rgba(43, 58, 74, 0.12)',
        'ocean-lg': '0 16px 36px rgba(43, 58, 74, 0.16)',
        'ocean-sm': '0 4px 12px rgba(43, 58, 74, 0.08)',
        glass: '0 8px 24px rgba(43, 58, 74, 0.12)',
        'glass-hover': '0 16px 36px rgba(43, 58, 74, 0.16)',
      },
      borderRadius: {
        card: '20px',
        hero: '24px',
        nav: '28px',
        pill: '9999px',
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
