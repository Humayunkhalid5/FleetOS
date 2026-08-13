import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('leaflet') || id.includes('socket.io-client')) {
              return 'map-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@constants': fileURLToPath(new URL('./src/constants/index.js', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils/helpers.js', import.meta.url)),
      '@context': fileURLToPath(new URL('./src/context/AppContext.jsx', import.meta.url)),
      '@hooks': fileURLToPath(new URL('./src/hooks/useAuth.js', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/services/api.js', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
