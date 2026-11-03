import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// Sicherheits-Header (inkl. CSP) aus vercel.json auch für `npm run preview` verwenden,
// damit der Produktions-Build lokal unter denselben Bedingungen getestet werden kann.
const loadSecurityHeaders = () => {
  try {
    const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf-8'))
    const rule = vercel.headers?.find((entry) => entry.source === '/(.*)')
    return Object.fromEntries((rule?.headers || []).map(({ key, value }) => [key, value]))
  } catch {
    return {}
  }
}

export default defineConfig({
  define: {
    // Versionsnummer aus package.json, angezeigt in Einstellungen und Anleitung
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
  build: {
    rollupOptions: {
      output: {
        // Große, selten geänderte Bibliotheken in eigene Dateien – bessere Browser-Caches bei Updates
        manualChunks(id) {
          if (id.includes('node_modules/jointjs') || id.includes('node_modules/@dagrejs')) return 'vendor-diagram'
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'vendor-react'
        },
      },
    },
    // JointJS + dagre sind ca. 700 kB groß und lassen sich nicht weiter aufteilen
    chunkSizeWarningLimit: 800,
  },
  preview: {
    headers: loadSecurityHeaders(),
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/test/setup.js'],
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
        lang: 'de',
        theme_color: '#00285a',
        background_color: '#ffffff',
        display: 'standalone',
      }
    }),
  ],
})
