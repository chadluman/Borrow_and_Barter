import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const productionCsp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'"

const productionCspPlugin = {
  name: 'production-content-security-policy',
  transformIndexHtml: {
    order: 'pre',
    handler() {
      return [{
        tag: 'meta',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content: productionCsp,
        },
        injectTo: 'head-prepend',
      }]
    },
  },
}

export default defineConfig(({ command }) => ({
  plugins: [react(), ...(command === 'build' ? [productionCspPlugin] : [])],
}))
