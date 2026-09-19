/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#060911",
        cardbg: "rgba(15, 23, 42, 0.75)",
        retinaCyan: "#00f2fe",
        retinaAmber: "#fbbf24",
      },
    },
  },
  plugins: [],
};