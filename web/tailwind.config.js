/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: 'var(--bg-base)',
          light: 'var(--bg-sidebar)',
        },
        sidebar: {
          DEFAULT: 'var(--bg-sidebar)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)',
        },
        editor: {
          DEFAULT: 'var(--bg-editor)',
          highlight: 'var(--bg-hover)',
        },
        ld: {
          DEFAULT: 'var(--bg-ld)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          light: 'var(--border-light)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: '#f97316',
          light: '#fb923c',
          dark: '#ea580c',
          glow: 'rgba(249, 115, 22, 0.15)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        info: 'var(--info)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Consolas', 'monospace'],
      },
      spacing: {
        sidebar: '280px',
        'sidebar-lg': '320px',
        toolbar: '48px',
        statusbar: '28px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(249, 115, 22, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
