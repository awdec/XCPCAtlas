import { defineConfig, devices } from '@playwright/test'

// E2E 跑在生产构建上（vite preview），与 GitHub Pages 部署形态一致
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 15000,
    // 视觉回归（M6-T5）：基线按平台保存，同平台渲染确定，故阈值收紧到 0.1%
    toHaveScreenshot: { maxDiffPixelRatio: 0.001, threshold: 0.2, animations: 'disabled' },
  },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/XCPCAtlas/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/XCPCAtlas/',
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /visual\.spec\.js/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /visual\.spec\.js/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/, testIgnore: /visual\.spec\.js/ },
    // 视觉回归单独一个项目：固定视口与 DPR，避免设备预设带来的尺寸漂移
    {
      name: 'visual',
      testMatch: /visual\.spec\.js/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
    },
  ],
})
