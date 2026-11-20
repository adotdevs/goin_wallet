/** @type {import('tailwindcss').Config} */
module.exports = {
  important: true,
  corePlugins: {
    preflight: true,
  },
  content: [
    "./src/jsx/pages/kycPortal/**/*.{js,jsx}",
    "./src/jsx/pages/authentication/Login.jsx",
    "./src/jsx/pages/authentication/Registration.jsx",
    "!./src/jsx/pages/kycPortal/goinLandingData.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        signature: ["'Dancing Script'", "'Pacifico'", "'Great Vibes'", "cursive"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)",
        "card-hover":
          "0 10px 25px -5px rgba(37, 99, 235, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
        panel: "-4px 0 24px -4px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
