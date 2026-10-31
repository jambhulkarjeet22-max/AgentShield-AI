import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Coolors Dark Palette: https://coolors.co/palette/101f3d-19365c-345a85-5d91b5-f5f7fa
        coolors: {
          deepNavy: '#101f3d',
          darkBlueGray: '#19365c',
          slateSteel: '#345a85',
          steelCerulean: '#5d91b5',
          iceWhite: '#f5f7fa',
        },
        // Coolors Light Palette: https://coolors.co/palette/dad7cd-a3b18a-588157-3a5a40-344e41
        sageLight: {
          timberwolf: '#dad7cd',
          sage: '#a3b18a',
          fernGreen: '#588157',
          hunterGreen: '#3a5a40',
          deepPine: '#344e41',
        },
        // Cyber Violet & Obsidian Black Palette
        cyber: {
          red: '#ef4444',
          'red-glow': 'rgba(239, 68, 68, 0.25)',
          blue: '#a855f7',
          'blue-glow': 'rgba(168, 85, 247, 0.35)',
          green: '#10b981',
          'green-glow': 'rgba(16, 185, 129, 0.25)',
          amber: '#f59e0b',
          'amber-glow': 'rgba(245, 158, 11, 0.25)',
          cyan: '#c084fc',
          violet: '#a855f7',
          dark: '#08050e',
          surface: '#120b1c',
          panel: '#241636',
          border: '#281938',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'radar-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radar-sweep 8s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;

