/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        black: '#000000',
        white: '#FFFFFF',
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
        },
        brand: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#0F172A', // Professional charcoal/black
          600: '#1E293B',
          700: '#334155',
          800: '#475569',
          900: '#020617',
          950: '#000000',
        },
      },
      fontFamily: {
        sans: ['"Averia Serif Libre"', 'figmaSans', '"figmaSans Fallback"', '"SF Pro Display"', 'system-ui', 'helvetica', 'sans-serif'],
        serif: ['"Averia Serif Libre"', 'figmaSans', '"figmaSans Fallback"', '"SF Pro Display"', 'system-ui', 'helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
