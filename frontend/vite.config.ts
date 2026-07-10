import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allows using '@/' as an alias to the '/src' directory
      // Example: import Navbar from '@/components/Navbar' instead of '../../components/Navbar'
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000, // Runs the local development server on port 3000
    host: true, // Exposes the server to local network (useful for mobile testing)
  },
})
