import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'vhs Workflow-Algorithm Editor',
        short_name: 'vhs Flowcharts',
        description: 'PWA-Tool zur Erstellung algorithmischer Ablaufpläne',
        theme_color: '#00285a',
        background_color: '#ffffff',
        display: 'standalone',
      }
    }),
  ],
})
