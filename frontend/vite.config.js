/**
 * Vite Build and Server Configuration
 * ===================================
 * Configures the build pipeline (React and Tailwind plugins),
 * proxy configurations for development APIs and websockets, and
 * optimized asset chunking strategies using manual Rollup output configurations.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true, // Listen on all network addresses
    port: 5173,
    proxy: {
      // Proxy REST API endpoints to Spring Boot backend
      '/api': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      // Proxy WebSocket channels to Spring Boot backend with WS protocols enabled
      '/ws': {
        target: 'http://localhost:8085',
        ws: true,
        changeOrigin: true,
      },
      // Proxy static uploads to Spring Boot backend
      '/uploads': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Code splitting: Group common vendors to optimize browser caching
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dev') || id.includes('react-router-dom')) {
              return 'vendor'
            }
            if (id.includes('@reduxjs') || id.includes('react-redux')) {
              return 'redux'
            }
          }
        },
      },
    },
  },
})
