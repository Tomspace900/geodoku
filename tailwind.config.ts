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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
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
