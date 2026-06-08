/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        konami: {
          red:        '#BF0021',
          'red-hover':'#E0001B',
          'red-dark': '#8B0018',
          black:      '#0D0D0D',
          surface:    '#1A1A1A',
          'surface-2':'#242424',
          'surface-3':'#2E2E2E',
          border:     '#2A2A2A',
          text:       '#FFFFFF',
          muted:      '#9E9E9E',
          dim:        '#5C5C5C',
          gold:       '#D4AF37',
          silver:     '#C0C0C0',
          bronze:     '#CD7F32',
          legendary:  '#9B59B6',
        }
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        heading: ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-red': 'pulseRed 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(191,0,33,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(191,0,33,0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'red-glow':       '0 0 20px rgba(191,0,33,0.4)',
        'red-glow-lg':    '0 0 40px rgba(191,0,33,0.5)',
        'gold-glow':      '0 0 20px rgba(212,175,55,0.4)',
        'legendary-glow': '0 0 20px rgba(155,89,182,0.5)',
        'card':           '0 4px 24px rgba(0,0,0,0.6)',
      }
    },
  },
  plugins: [],
}
