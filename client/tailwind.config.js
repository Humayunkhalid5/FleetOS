/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

// Every colour below resolves to a CSS variable defined in src/styles/tokens.css.
// Light and dark values live there, so a utility such as `bg-surface` or
// `text-muted` is correct in both themes without per-page dark overrides.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const tone = (name) => ({
  DEFAULT: token(name),
  soft: token(`${name}-soft`),
  fg: token(`${name}-fg`),
  line: token(`${name}-line`),
});

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Tone utilities are composed at runtime (e.g. `bg-${tone}-soft`).
  safelist: [{ pattern: /^(bg|text|border)-(brand|accent|success|warning|danger|info|violet)(-(soft|fg|line))?$/ }],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        raised: token('raised'),
        sunken: token('sunken'),
        ink: token('ink'),
        muted: token('muted'),
        subtle: token('subtle'),
        line: token('line'),
        'line-strong': token('line-strong'),
        navy: token('navy'),
        steel: token('steel'),
        mist: token('mist'),
        brand: {
          DEFAULT: token('brand'),
          hover: token('brand-hover'),
          soft: token('brand-soft'),
          fg: token('brand-fg'),
          line: token('brand-line'),
          on: token('brand-on'),
        },
        accent: tone('accent'),
        success: tone('success'),
        warning: tone('warning'),
        danger: tone('danger'),
        info: tone('info'),
        violet: tone('violet'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '14px' }],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '22px',
        '4xl': '28px',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
        glow: 'var(--shadow-glow)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'rise-in': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(.96)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out both',
        'rise-in': 'rise-in .32s cubic-bezier(.22,1,.36,1) both',
        'scale-in': 'scale-in .18s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [forms({ strategy: 'class' }), containerQueries],
};
