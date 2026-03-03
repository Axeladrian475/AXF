/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'axf-blue': '#072139',  // Tu azul corporativo
        'axf-orange': '#F16923', // Tu naranja corporativo
      },
      fontFamily: {
        'jockey': ['"Jockey One"', 'sans-serif'], // Nombre para Tailwind
      },
    },
  },
  plugins: [],
}