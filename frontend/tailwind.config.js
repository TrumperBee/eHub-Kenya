/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        konami: {
          blue:       '#003BFF',
          'blue-hover':'#0030D9',
          'blue-dark': '#001E7A',
          'blue-deep': '#001450',
          yellow:     '#FFF100',
          'yellow-hover': '#FFE600',
          'yellow-dark':  '#E6D900',
          white:      '#FFFFFF',
          red:        '#C8102E',
          'red-hover':'#A50D26',
          text:       '#111111',
          'text-muted':'#6B7280',
          'text-dim': '#9CA3AF',
          'light-gray':'#F5F5F5',
          'mid-gray': '#E0E0E0',
          surface:    '#FFFFFF',
          'surface-2':'#F5F5F5',
          'on-blue':  '#FFFFFF',
          gold:       '#D4AF37',
          silver:     '#C0C0C0',
          bronze:     '#CD7F32',
          legendary:  '#9B59B6',
        }
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'live-pulse': 'livePulse 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'page-in': 'pageIn 0.3s ease-out forwards',
        'logo-reveal': 'logoReveal 0.6s ease-out forwards',
        'load-progress': 'loadProgress 2s ease-in-out forwards',
        'bounce-soft': 'bounceSoft 0.8s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        livePulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.8)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pageIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        logoReveal: {
          '0%': { opacity: '0', transform: 'scale(0.8) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        loadProgress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      boxShadow: {
        'blue-glow':   '0 0 30px rgba(0,59,255,0.4)',
        'yellow-glow': '0 0 20px rgba(255,241,0,0.5)',
        'card':        '0 4px 20px rgba(0,0,0,0.08)',
        'card-hover':  '0 8px 40px rgba(0,59,255,0.2)',
        'card-lg':     '0 8px 32px rgba(0,0,0,0.12)',
      }
    },
  },
  plugins: [],
}
