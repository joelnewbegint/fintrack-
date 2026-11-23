/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FFFBEF',
          50: '#FFFFFF',
          100: '#FFFBEF',
          200: '#FFF5D6',
          300: '#FFEDB8',
        },
        'gold-soft': {
          DEFAULT: '#FFE7A8',
          light: '#FFF0C7',
          dark: '#F5D382',
        },
        apricot: {
          DEFAULT: '#FFC9A0',
          light: '#FFD7B8',
          dark: '#F5B07E',
        },
        accent: {
          DEFAULT: '#FFC94D',
          hover: '#FFBE2E',
          active: '#F5B119',
          deep: '#C88A00',
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
        golden: '0 8px 24px rgba(43, 58, 74, 0.12)',
        'golden-lg': '0 16px 36px rgba(43, 58, 74, 0.16)',
        'golden-sm': '0 4px 12px rgba(43, 58, 74, 0.08)',
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
