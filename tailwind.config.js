/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Brand = purple. Used across UI chrome (nav, buttons, active states,
        // gradients). Semantic score colors stay emerald/amber/rose elsewhere.
        brand: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
      boxShadow: {
        card: '0 6px 24px -8px rgba(16,24,40,0.14), 0 2px 6px rgba(16,24,40,0.05)',
        // Deeper, layered elevation for hero surfaces (report header, expanded cards).
        'card-lg': '0 24px 50px -16px rgba(16,24,40,0.18), 0 8px 16px -8px rgba(16,24,40,0.08)',
        // Floating glass chrome (sidebar rail, frosted navbar).
        float: '0 12px 40px -12px rgba(16,24,40,0.18), 0 2px 8px rgba(16,24,40,0.06)',
        // Inset top highlight that sells the "glass" edge. Pair with a blur.
        'glass-edge': 'inset 0 1px 0 rgba(255,255,255,0.65), 0 12px 40px -12px rgba(16,24,40,0.16)',
        // Colored ambient glow for brand CTAs / active tiles.
        glow: '0 24px 60px -20px rgba(147,51,234,0.35)',
        'glow-sm': '0 8px 24px -8px rgba(147,51,234,0.45)',
        // Tactile press state for flashcards & buttons.
        pressed: 'inset 0 2px 6px rgba(16,24,40,0.12)',
      },
      backgroundImage: {
        // Soft aurora wash for the app canvas — keeps content areas calm
        // while killing the "flat admin template" feel.
        aurora:
          'radial-gradient(1100px 500px at 85% -10%, rgba(168,85,247,0.10), transparent 60%), radial-gradient(900px 420px at -10% 20%, rgba(56,189,248,0.08), transparent 55%), radial-gradient(700px 380px at 50% 115%, rgba(16,185,129,0.06), transparent 60%)',
        'card-sheen':
          'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.4))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'float-in': 'floatIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shimmer: 'shimmer 2.4s linear infinite',
        'pop': 'pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        floatIn: {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pop: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
