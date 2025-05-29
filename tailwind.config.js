/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#C1E4E5',
          DEFAULT: '#A8DADC',
          dark: '#8FCACF'
        },
        secondary: {
          light: '#2D4A76',
          DEFAULT: '#1D3557',
          dark: '#142642'
        },
        background: '#F1FAEE',
        accent: {
          red: '#E63946',
          yellow: '#F9C74F',
          green: '#43AA8B'
        }
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
};