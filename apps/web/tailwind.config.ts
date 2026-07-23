import type { Config } from 'tailwindcss';

// Design tokens for the staff/patient console — a calm, institutional
// "clinical ledger" identity: warm paper background, near-black ink,
// a single muted teal accent, and amber reserved strictly for
// urgent/escalation states (never decorative).
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F4EF',
        ink: '#16232A',
        'ink-muted': '#5B6B70',
        hairline: '#DCD6C9',
        clinical: {
          DEFAULT: '#2F6F62',
          dark: '#234F46',
          light: '#E4EEEB',
        },
        signal: {
          DEFAULT: '#B8763A',
          light: '#F5E7D8',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        badge: '999px',
      },
    },
  },
  plugins: [],
};
export default config;
