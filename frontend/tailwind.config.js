/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: "#0b3d2e",
        feltdark: "#072218",
        gold: "#d4af37",
        ivory: "#f4ead5",
        wine: "#5a1a1a",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 24px rgba(0,0,0,.45)",
      },
    },
  },
  plugins: [],
};
