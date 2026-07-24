import type { Config } from 'tailwindcss';

// Design tokens v2 — moved away from the "clinical ledger" identity
// (warm paper, serif, hairlines) toward a cooler, more contemporary
// health-tech feel: a neutral cool canvas, real elevation (shadow, not
// just borders), a deeper more saturated teal, and coral reserved
// strictly for urgent/escalation states.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F7FA',
        surface: '#FFFFFF',
        ink: '#0F1B2A',
        'ink-muted': '#64748B',
        hairline: '#E2E8F0',
        clinical: {
          DEFAULT: '#0F766E',
          dark: '#0B5B54',
          light: '#E6F5F3',
          soft: '#14B8A6',
        },
        signal: {
          DEFAULT: '#E8604C',
          light: '#FDECE9',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        badge: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 27, 42, 0.04), 0 1px 3px rgba(15, 27, 42, 0.06)',
        elevated: '0 4px 16px rgba(15, 27, 42, 0.08), 0 2px 4px rgba(15, 27, 42, 0.04)',
      },
      backgroundImage: {
        'clinical-gradient': 'linear-gradient(135deg, #0B5B54 0%, #0F766E 50%, #14B8A6 100%)',
      },
      keyframes: {
        'pulse-draw': {
          '0%': { strokeDashoffset: '1' },
          '70%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'pulse-draw': 'pulse-draw 2.4s ease-out forwards',
      },
    },
  },
  plugins: [],
};
export default config;
