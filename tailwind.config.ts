import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        excel: {
          dark: "#0F172A",     // Slate 900 for ultra-premium dark
          mid: "#1E293B",      // Slate 800
          light: "#F8FAFC",    // Slate 50
          blue: "#3B82F6",
          green: "#10B981",
          red: "#EF4444",
          toolbar: "#FFFFFF",
          tab: "#F1F5F9",      // Slate 100
          "row-green": "#F0FDF4",
          "row-red": "#FEF2F2",
          "edit-bg": "#FEF9C3", // Yellow 100
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 0 3px rgba(0,0,0,0.02)',
        'premium-hover': '0 10px 25px -4px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 15px rgba(59, 130, 246, 0.3)',
      }
    },
  },
  plugins: [],
};
export default config;
