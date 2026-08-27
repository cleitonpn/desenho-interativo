/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)',
          deep: 'rgb(var(--c-brand-deep) / <alpha-value>)',
          soft: 'rgb(var(--c-brand-soft) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // Titulos com cara de carimbo/serigrafia, combinando com o traco do Vital
        display: ['Archivo Black', 'Impact', 'Haettenschweiler', 'sans-serif'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.5rem', '4xl': '2rem' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.14)',
        lift: '0 2px 4px rgb(0 0 0 / 0.06), 0 18px 40px -16px rgb(0 0 0 / 0.24)',
        glow: '0 12px 32px -10px rgb(255 26 14 / 0.45)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'pop': { '0%': { transform: 'scale(.8)', opacity: '0' }, '60%': { transform: 'scale(1.04)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        'deslizar': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        'fade-up': 'fade-up .28s cubic-bezier(.2,.8,.2,1) both',
        'scale-in': 'scale-in .18s cubic-bezier(.2,.8,.2,1) both',
        'sheet-up': 'sheet-up .3s cubic-bezier(.2,.9,.2,1) both',
        'pop': 'pop .32s cubic-bezier(.2,.8,.2,1) both',
        'deslizar': 'deslizar 40s linear infinite',
      },
    },
  },
  plugins: [],
}
