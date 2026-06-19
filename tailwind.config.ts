import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // App surface palette (slate-based dark theme)
        bg: {
          base: "#0a0e14",
          surface: "#11161f",
          elevated: "#161d28",
          hover: "#1c2532",
        },
        border: {
          subtle: "#202a38",
          DEFAULT: "#2a3647",
          strong: "#3a4a60",
        },
        content: {
          primary: "#e8edf4",
          secondary: "#9aa7b8",
          muted: "#647082",
        },
        brand: {
          DEFAULT: "#f7931a", // bitcoin orange
          soft: "#f7931a22",
          hover: "#ffa733",
        },
        profit: {
          DEFAULT: "#22c55e",
          soft: "#22c55e1a",
        },
        loss: {
          DEFAULT: "#f43f5e",
          soft: "#f43f5e1a",
        },
        long: "#22c55e",
        short: "#f43f5e",
        warn: {
          DEFAULT: "#f59e0b",
          soft: "#f59e0b1a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 1px 1px rgba(0,0,0,0.2)",
        glow: "0 0 0 1px rgba(247,147,26,0.4), 0 4px 24px rgba(247,147,26,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
