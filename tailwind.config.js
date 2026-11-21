// Works in the browser (Tailwind CDN) and in VS Code (Tailwind extension runs it in Node).
(function () {
  const config = {
  content: ["./*.html", "./*.js"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          900: "#064e3b",
        },
        navy: {
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: [
          "Aptos",
          "Segoe UI Variable",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        serif: ["Georgia", "serif"],
      },
    },
  },
};
  if (typeof tailwind !== "undefined") tailwind.config = config;
  if (typeof module !== "undefined") module.exports = config;
})();
