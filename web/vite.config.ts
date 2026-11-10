import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { minifyData } from './vite-plugins/minify-data.ts'

export default defineConfig({
  base: '/XCPCAtlas/',
  plugins: [vue(), tailwindcss(), minifyData()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  worker: { format: 'es' },
  server: {
    port: 11451,
    host: false,
  },
})
