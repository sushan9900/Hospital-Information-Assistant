/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables toggleable Dark Mode support via class
  theme: {
    extend: {
      colors: {
        // Sleek, modern, and harmonious HSL-based color palette for premium feel
        brand: {
          50: '#f0fdf4',   // Emerald tint
          100: '#dcfce7',
          500: '#10b981',  // Main emerald green (hospital/health branding)
          600: '#059669',
          700: '#047857',
        },
        slate: {
          950: '#0b1329',  // Deep dark mode background
        }
      },
      fontFamily: {
        // Premium modern fonts (Outfit or Inter recommended)
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
