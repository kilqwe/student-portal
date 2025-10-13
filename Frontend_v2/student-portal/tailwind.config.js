/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        roboto: ["Roboto", "sans-serif"],
        system: ['system-ui', ...defaultTheme.fontFamily.sans],
      },
    },
    fontFamily: {
      sans: ["Poppins", "sans-serif"], // 👈 default for body, buttons, menus
    },
  },
  plugins: [],
}
