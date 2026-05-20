import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Manrope", "sans-serif"],
        body: ["DM Sans", "sans-serif"]
      },
      colors: {
        brand: {
          DEFAULT: "#0f766e",
          soft: "#ccfbf1"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
