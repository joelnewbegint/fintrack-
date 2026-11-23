/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ocean Blue Global Color Palette (Strict Specification)
        primary: {
          DEFAULT: '#0878D1', // Primary Blue
          deep: '#064B8E',    // Deep Ocean
          sky: '#55B8F5',     // Sky Blue
          light: '#EAF5FF',   // Light Blue
        },
        ocean: {
          DEFAULT: '#0878D1',
          primary: '#0878D1',
          deep: '#064B8E',
          sky: '#55B8F5',
          light: '#EAF5FF',
          bg: '#F3F9FF',
          border: '#D5E9FA',
          text: '#183653',
          muted: '#647C95',
        },
        ice: {
          DEFAULT: '#F3F9FF',
          50: '#FFFFFF',
          100: '#F3F9FF',
          200: '#EAF5FF',
          300: '#D5E9FA',
        },
        sky: {
          DEFAULT: '#55B8F5',
          light: '#EAF5FF',
          dark: '#0878D1',
        },
        'ocean-soft': {
          DEFAULT: '#EAF5FF',
          light: '#F3F9FF',
          dark: '#D5E9FA',
        },
        accent: {
          DEFAULT: '#0878D1',
          hover: '#064B8E',
          active: '#053C72',
          deep: '#064B8E',
        },
        ink: {
          DEFAULT: '#183653',
          light: '#647C95',
          dark: '#0C1C2B',
        },
        muted: {
          DEFAULT: '#647C95',
          light: '#889EB5',
          dark: '#183653',
        },
        border: {
          DEFAULT: '#D5E9FA',
          ocean: '#D5E9FA',
        },
        success: {
          DEFAULT: '#18A879',
          bg: '#EAF5FF',
          text: '#18A879',
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
            bg: '#EAF5FF',
            text: '#18A879',
          },
          upcoming: {
            bg: '#FFFFFF',
            text: '#183653',
          },
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Noto Sans Tamil"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        ocean: '0 8px 30px rgba(8, 120, 209, 0.08)',
        'ocean-lg': '0 16px 40px rgba(6, 75, 142, 0.12)',
        'ocean-sm': '0 4px 16px rgba(8, 120, 209, 0.05)',
        glass: '0 8px 30px rgba(8, 120, 209, 0.08)',
        'glass-hover': '0 16px 40px rgba(8, 120, 209, 0.14)',
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
