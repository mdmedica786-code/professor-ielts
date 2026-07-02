/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      backgroundImage: {
        'aurora': "radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.06) 0%, transparent 40%), radial-gradient(circle at 100% 0%, rgba(168, 85, 247, 0.06) 0%, transparent 40%), radial-gradient(circle at 50% 100%, rgba(16, 185, 129, 0.06) 0%, transparent 40%)",
      },
      boxShadow: {
        'card': '0 8px 30px -6px rgba(0, 0, 0, 0.04), 0 4px 12px -3px rgba(0, 0, 0, 0.02)',
        'card-lg': '0 20px 40px -8px rgba(0, 0, 0, 0.06), 0 10px 20px -4px rgba(0, 0, 0, 0.03)',
        'glow-sm': '0 0 12px rgba(99, 102, 241, 0.3)',
        'glass-edge': 'inset 0 1px 1px rgba(255, 255, 255, 0.4), 0 8px 30px -4px rgba(0, 0, 0, 0.05)',
        'pressed': 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'float': '0 12px 24px -8px rgba(0, 0, 0, 0.1), 0 4px 8px -4px rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        'float-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pop': {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        }
      },
      animation: {
        'float-in': 'float-in 0.4s ease-out forwards',
        'shimmer': 'shimmer 3s infinite linear',
        'pop': 'pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
}
