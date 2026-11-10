import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/unit/**/*.test.{js,ts}', 'tests/golden/**/*.test.{js,ts}'],
    environment: 'node',
    testTimeout: 120000,
    environmentMatchGlobs: [['tests/unit/components/**', 'happy-dom']],
  },
})
