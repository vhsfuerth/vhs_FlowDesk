import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: [
      {
        // Force the CJS build of JointJS so joint.shapes stays a plain extensible
        // object. The ESM build (joint.mjs) exposes shapes as a Module namespace,
        // which is non-extensible by spec and breaks Object.assign(joint.shapes, …).
        // Use regex to match only exact 'jointjs' imports, not 'jointjs/dist/joint.css'.
        find: /^jointjs$/,
        replacement: fileURLToPath(new URL('./node_modules/jointjs/dist/joint.js', import.meta.url)),
      },
    ],
  },
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
