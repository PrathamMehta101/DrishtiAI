/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Page background: #F5F7F9
        background: '#F5F7F9',
        surface: {
          DEFAULT: '#F5F7F9', // Light neutral page background
          '1': '#FFFFFF',     // Primary content surface (panels, cards)
          '2': '#F8FAFC',     // Secondary / inset surface
          '3': '#F1F5F9',     // Inset wells
          '4': '#E2E8F0',     // Inset borders
          overlay: '#FFFFFF',
        },

        // Text colors
        text: {
          primary: '#1E293B',
          secondary: '#64748B',
          muted: '#94A3B8',
        },

        // Primary action: #243746 (dark slate)
        accent: {
          DEFAULT: '#243746',
          hover: '#1E293B',
          dim: '#334D60',
          glow: 'rgba(36, 55, 70, 0.15)',
        },

        // Borders
        border: {
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1',
        },

        // Slate Color System
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
          dark: '#243746',
          deep: '#334D60',
          blue: '#4A6275',
          muted: '#64748B',
          soft: '#94A3B8',
          light: '#E2E8F0',
        },

        // Semantic indicators
        risk: {
          low: '#10B981',    // green
          medium: '#D97706', // amber
          high: '#E11D48',   // rose/red
        },

        // Status
        status: {
          queued: '#64748B',
          processing: '#243746',
          completed: '#10B981',
          failed: '#E11D48',
          escalated: '#E11D48',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '8px',
        xl: '12px',
      },
      transitionTimingFunction: {
        forensic: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
        fast: '150ms',
        slow: '250ms',
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(15, 23, 42, 0.03)',
        xs: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        accent: '0 0 0 1px rgba(36, 55, 70, 0.4)',
        'accent-glow': '0 0 20px rgba(36, 55, 70, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 200ms ease-out forwards',
        'slide-up': 'slideUp 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
