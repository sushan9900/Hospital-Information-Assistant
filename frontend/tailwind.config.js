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
        // Flat tokens for base theme colors to avoid PostCSS nesting issues
        'clinic-bg': '#FBF8F3',         // Warm ivory/paper base background
        'clinic-text': '#2B2B28',       // Warm near-black text
        
        // Nested brand colors
        clinic: {
          forest: {
            50: '#f2f6f4',
            100: '#e1ede7',
            500: '#1B4332',      // Primary deep forest green
            600: '#143326',      // Primary hover forest
            700: '#0E241B',      // Primary active forest
          },
          sage: {
            50: '#f3f6f4',
            100: '#e5ece7',
            200: '#cad9ce',      // Muted sage border tint
            500: '#84A98C',      // Secondary sage green
            600: '#6C9475',
          },
          terracotta: {
            50: '#fdf6f3',
            100: '#faece6',
            500: '#C97C5D',      // Accent warm terracotta/clay for CTAs/alerts
            600: '#B06446',
          }
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],  // Premium editorial headings
        sans: ['Inter', 'system-ui', 'sans-serif'],          // Humanist clean body text
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(43, 43, 40, 0.03), 0 2px 8px -1px rgba(0, 0, 0, 0.02)',
        'premium-hover': '0 12px 30px -4px rgba(43, 43, 40, 0.06), 0 4px 16px -2px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}
