/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sky: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          950: '#082F49',
        },
        ink: {
          DEFAULT: '#0C4A6E',
          deep: '#031D2E',
          light: '#075985',
        },
        muted: {
          DEFAULT: '#64748B',
          light: '#94A3B8',
          dark: '#475569',
        },
        finance: {
          daily: '#F59E0B',    // Amber
          weekly: '#0EA5E9',   // Sky
          monthly: '#14B8A6',  // Teal
        },
        status: {
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
        daily: {
          light: '#fef3c7',
          DEFAULT: '#f59e0b',
          dark: '#b45309',
        },
        weekly: {
          light: '#e0f2fe',
          DEFAULT: '#0ea5e9',
          dark: '#0369a1',
        },
        monthly: {
          light: '#ccfbf1',
          DEFAULT: '#14b8a6',
          dark: '#0f766e',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Noto Sans Tamil', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(14, 165, 233, 0.15)',
        'glass-hover': '0 16px 40px rgba(14, 165, 233, 0.25)',
        'glass-dark': '0 8px 32px rgba(2, 132, 199, 0.25)',
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
