import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'MedIntel Dashboard',
        short_name: 'MedIntel',
        description: 'Intelligent Public Health Ecosystem',
        theme_color: '#1a1f3c',
        background_color: '#0f172a',
        display: 'standalone',
      }
    })
  ],
  base: command === 'serve' ? '/' : '/static/',
  build: {
    outDir: '../backend/frontend',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
}))
