import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5174,
    // Same-origin in dev so the httpOnly refresh cookie works without CORS setup.
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
