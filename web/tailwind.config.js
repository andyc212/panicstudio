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
          DEFAULT: '#0f1117',
          light: '#161b22',
        },
        sidebar: {
          DEFAULT: '#161b22',
          hover: '#21262d',
          active: '#30363d',
        },
        editor: {
          DEFAULT: '#1e1e2e',
          highlight: '#2a2d3e',
        },
        ld: {
          DEFAULT: '#181825',
        },
        border: {
          DEFAULT: '#30363d',
          light: '#21262d',
        },
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          muted: '#484f58',
        },
        accent: {
          DEFAULT: '#f97316',
          light: '#fb923c',
          dark: '#ea580c',
          glow: 'rgba(249, 115, 22, 0.15)',
        },
        success: '#22c55e',
        warning: '#eab308',
        error: '#ef4444',
        info: '#0ea5e9',
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
