// 视觉回归（计划 M6-T5 / 审查 P2-7）：真实像素断言，界面变化会令检查失败。
// 基线按平台后缀保存（Playwright 默认）：Windows 基线已提交；
// Linux（CI）首次运行会因缺少基线而跳过，需在 CI 上跑一次 --update-snapshots 并提交。
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import * as po from './po/app.js'

const ROUTES = [
  ['home', '/'],
  ['announcement', '/announcement'],
  ['year', '/2025/'],
  ['contest', '/2025/contest/nanjing'],
  ['summary', '/2025/summary'],
  ['players', '/2025/players'],
  ['analysis', '/2025/analysis'],
  ['analysis-players', '/2025/analysis?tab=players'],
  ['trajectory', '/2026/trajectory/b-n-n-n-n'],
  ['school', `/2025/school/${encodeURIComponent('清华大学')}`],
]

for (const [name, route] of ROUTES) {
  test(`视觉基线 ${name}`, async ({ page }, testInfo) => {
    const snapshot = testInfo.snapshotPath(`${name}.png`)
    const updating = testInfo.config.updateSnapshots !== 'none'
    test.skip(!updating && !fs.existsSync(snapshot), `缺少 ${process.platform} 基线：${snapshot}`)

    await po.open(page, route)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: false })
  })
}
