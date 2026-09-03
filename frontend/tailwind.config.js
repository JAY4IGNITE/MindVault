/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#f8fafc', // Slate-50
        surface: '#ffffff',
        primary: {
          DEFAULT: '#334155', // Slate-700
          dark: '#1e293b',    // Slate-800
          light: '#475569',   // Slate-600
        },
        secondary: '#64748b', // Slate-500
        muted: '#94a3b8',     // Slate-400
        accent: {
          DEFAULT: '#0284c7', // Sky-600
          hover: '#0369a1',   // Sky-700
          light: '#e0f2fe',   // Sky-100
        },
        success: '#10b981',   // Emerald-500
        error: '#ef4444',     // Red-500
        border: '#e2e8f0',    // Slate-200
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'premium': '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
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
};
