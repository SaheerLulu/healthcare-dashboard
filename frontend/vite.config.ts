import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    // Bind 0.0.0.0 (not just localhost) so the dev server is reachable from
    // other machines / the internet, and accept any Host header — Vite 6
    // otherwise rejects requests whose host isn't localhost/an IP (DNS-
    // rebind protection), which would 403 access via a public domain.
    // Dev-only convenience; do not ship this to a real deployment.
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
    },
  },
})
