import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        serif: ["Newsreader", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          DEFAULT: "hsl(var(--color-surface) / <alpha-value>)",
          low: "hsl(var(--color-surface-low) / <alpha-value>)",
          lowest: "hsl(var(--color-surface-lowest) / <alpha-value>)",
          highest: "hsl(var(--color-surface-highest) / <alpha-value>)",
        },
        "on-surface": {
          DEFAULT: "hsl(var(--color-on-surface) / <alpha-value>)",
          variant: "hsl(var(--color-on-surface-variant) / <alpha-value>)",
        },
        "outline-variant": "hsl(var(--color-outline-variant) / <alpha-value>)",
        brand: {
          DEFAULT: "hsl(var(--color-brand) / <alpha-value>)",
        },
        success: "hsl(var(--color-success) / <alpha-value>)",
        warning: "hsl(var(--color-warning) / <alpha-value>)",
        error: "hsl(var(--color-error) / <alpha-value>)",
        rarity: {
          common: "hsl(var(--color-rarity-common) / <alpha-value>)",
          uncommon: "hsl(var(--color-rarity-uncommon) / <alpha-value>)",
          rare: "hsl(var(--color-rarity-rare) / <alpha-value>)",
          ultra: "hsl(var(--color-rarity-ultra) / <alpha-value>)",
        },
      },
      boxShadow: {
        editorial: "var(--shadow-editorial)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
