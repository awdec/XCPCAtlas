import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['tests/unit/**/*.test.{js,ts}', 'tests/golden/**/*.test.{js,ts}'],
    environment: 'node',
    testTimeout: 120000,
  },
})
