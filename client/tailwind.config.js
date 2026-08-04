/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
        "on-secondary-fixed-variant": "#38485a",
        "surface-variant": "#e1e3e4",
        "surface-container-lowest": "#ffffff",
        "on-tertiary-container": "#f5fff6",
        "secondary-fixed": "#d2e4fb",
        "on-primary-fixed-variant": "#004493",
        "on-secondary-fixed": "#0b1d2d",
        "error-container": "#ffdad6",
        "primary": "#0058bc",
        "primary-fixed-dim": "#adc6ff",
        "on-tertiary-fixed-variant": "#005236",
        "inverse-surface": "#2e3132",
        "outline": "#717786",
        "inverse-on-surface": "#f0f1f2",
        "tertiary-fixed": "#6ffbbe",
        "tertiary": "#006947",
        "primary-container": "#0070eb",
        "on-background": "#191c1d",
        "primary-fixed": "#d8e2ff",
        "on-secondary-container": "#556679",
        "secondary-fixed-dim": "#b7c8de",
        "on-error-container": "#93000a",
        "on-secondary": "#ffffff",
        "outline-variant": "#c1c6d7",
        "surface-container-low": "#f3f4f5",
        "on-error": "#ffffff",
        "on-primary-container": "#fefcff",
        "secondary": "#4f6073",
        "surface-tint": "#005bc1",
        "background": "#f8f9fa",
        "surface-container": "#edeeef",
        "surface": "#f8f9fa",
        "secondary-container": "#d2e4fb",
        "on-surface": "#191c1d",
        "surface-bright": "#f8f9fa",
        "surface-container-highest": "#e1e3e4",
        "on-primary": "#ffffff",
        "tertiary-fixed-dim": "#4edea3",
        "inverse-primary": "#adc6ff",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#00855b",
        "on-tertiary-fixed": "#002113",
        "surface-dim": "#d9dadb",
        "on-primary-fixed": "#001a41",
        "error": "#ba1a1a",
        "surface-container-high": "#e7e8e9",
        "on-surface-variant": "#414755"
      },
      "borderRadius": {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      "spacing": {
        "md": "16px",
        "container-margin": "24px",
        "xs": "4px",
        "xl": "32px",
        "sm": "8px",
        "lg": "24px",
        "gutter": "16px",
        "base": "4px"
      },
      "fontFamily": {
        "nav-item": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "headline-lg": ["Inter", "sans-serif"],
        "headline-lg-mobile": ["Inter", "sans-serif"]
      },
      "fontSize": {
        "nav-item": ["14px", {"lineHeight": "20px", "fontWeight": "500"}],
        "body-md": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
        "body-lg": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
        "label-sm": ["12px", {"lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600"}],
        "headline-md": ["20px", {"lineHeight": "28px", "fontWeight": "600"}],
        "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "headline-lg-mobile": ["24px", {"lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "700"}]
      }
    },
  },
  plugins: [
    forms,
    containerQueries,
  ],
}
