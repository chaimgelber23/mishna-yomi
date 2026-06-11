import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Sefer ink — warm near-blacks (replaces the old blue "navy") */
        ink: {
          950: '#1C160D',
          900: '#221A10',
          800: '#2A2014',
          700: '#3A2C1B',
          600: '#4A3A24',
          500: '#6F6049',
        },
        /* Brass / gold leaf */
        brass: {
          50:  '#FBF6EC',
          100: '#F2E6CC',
          200: '#E6C982',
          300: '#D8B566',
          400: '#C9A96E',
          500: '#A07840',
          600: '#856230',
          700: '#6E5224',
          800: '#553F1B',
          900: '#3A2C12',
        },
        parchment: {
          50:  '#FFFDF8',
          100: '#FBF6EC',
          200: '#F4EAD6',
          300: '#EADBBE',
        },
      },
      fontFamily: {
        sans:   ['var(--font-inter)', 'system-ui', 'sans-serif'],
        hebrew: ['var(--font-frank)', 'Noto Serif Hebrew', 'serif'],
        serif:  ['var(--font-frank)', 'Georgia', 'serif'],
        frank:  ['var(--font-frank)', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-ink':    'linear-gradient(135deg, #2E2316 0%, #1C160D 100%)',
        'gradient-brass':  'linear-gradient(135deg, #C9A96E 0%, #A07840 50%, #856230 100%)',
      },
      animation: {
        'fade-in':    'fadeIn 0.6s ease-out forwards',
        'slide-up':   'slideUp 0.5s ease-out forwards',
        'glow':       'glow 2s ease-in-out infinite alternate',
        'shimmer':    'shimmer 2s linear infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { textShadow: '0 0 10px rgba(160,120,64,0.3)' },
          '100%': { textShadow: '0 0 30px rgba(160,120,64,0.6), 0 0 60px rgba(160,120,64,0.3)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(160,120,64,0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(160,120,64,0.15)' },
        },
      },
      boxShadow: {
        'brass':    '0 0 20px rgba(160,120,64,0.3)',
        'brass-lg': '0 0 40px rgba(160,120,64,0.4)',
        'ink':      '0 4px 40px rgba(28,22,13,0.5)',
        'card':     '0 1px 3px rgba(34,26,16,0.08), 0 8px 24px rgba(34,26,16,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
