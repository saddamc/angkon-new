import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        brand: {
          bg: "#400604",
          maroon: "#400604",
          surface: "#4a0705",
          "surface-dark": "#2b0403",
          gold: "#E1B76F",
          "gold-hover": "#f3cb87",
          "gold-muted": "#cbb18a",
          border: "#5c0f0d",
          "border-gold": "rgba(225, 183, 111, 0.25)",
          // Heritage luxury palette token mappings
          yellow: "#E1B76F",
          "yellow-hover": "#f3cb87",
          black: "#2b0403",
          charcoal: "#400604",
          muted: "#cbb18a",
          dark: "#1e0302",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        brand: "12px",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "Poppins", "sans-serif"],
        heading: ["var(--font-lato)", "Lato", "sans-serif"],
        display: ["var(--font-lato)", "Lato", "sans-serif"],
      },
      backgroundImage: {
        "hero-grid": "radial-gradient(circle at 20% 20%, rgba(251, 221, 2, 0.15), transparent 55%), radial-gradient(circle at 80% 0%, rgba(0, 0, 0, 0.05), transparent 38%)",
      },
      boxShadow: {
        premium: "0 16px 40px rgba(0, 0, 0, 0.08)",
        astra: "0px 0px 4px 0 #00000057",
        drawer: "-4px 0 24px rgba(0, 0, 0, 0.15)",
      },
    },
  },
  safelist: [
    // Dynamic colour classes used in admin dashboard status pills
    {
      pattern: /^(bg|text|border)-(amber|blue|yellow|emerald|red|gray|rose|purple)-(50|100|200|300|400|500|600|700|800)/,
    },
  ],
  plugins: [],
};

export default config;
