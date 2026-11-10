// M0-T5：截图与性能指标采集（参考材料）。用法：node tests/visual/baseline.mjs <输出目录>
// 需先运行 vite preview（端口 4173）。
// 像素断言在 tests/e2e/visual.spec.js（--project=visual）；本脚本只产出指标与人工对比截图。
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const out = process.argv[2] || 'tests/visual/baseline'
fs.mkdirSync(out, { recursive: true })
const base = 'http://localhost:4173/XCPCAtlas/'
const routes = ['/', '/announcement', '/2025/', '/2025/contest/nanjing', '/2025/summary', '/2025/players',
  '/2025/analysis', '/2025/analysis?tab=players', '/2026/trajectory/b-n-n-n-n', '/2025/school/%E6%B8%85%E5%8D%8E%E5%A4%A7%E5%AD%A6']
const browser = await chromium.launch()
const metrics = {}
for (const [w, h] of [[1280, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  await ctx.addInitScript(() => localStorage.setItem('xcpc_intro_seen_v1', String(Date.now())))
  const page = await ctx.newPage()
  for (const r of routes) {
    const t0 = Date.now()
    await page.goto(base + '#' + r, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const ms = Date.now() - t0
    const cls = await page.evaluate(() => new Promise(res => {
      let v = 0
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value }).observe({ type: 'layout-shift', buffered: true })
      setTimeout(() => res(v), 100)
    }))
    const name = `${w}_${r.replace(/[^a-z0-9]+/gi, '_')}`
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: false })
    metrics[`${w} ${r}`] = { readyMs: ms, cls: Number(cls.toFixed(4)) }
  }
  // 交互耗时：Summary 搜索输入到结果真正更新（含 300ms 防抖），不是防抖前的两帧
  if (w === 1280) {
    await page.goto(base + '#/2025/summary', { waitUntil: 'networkidle' })
    const input = page.getByPlaceholder('搜索学校')
    await input.waitFor()
    const countText = () => page.evaluate(() => {
      const el = [...document.querySelectorAll('span')].find(s => /^共 \d+ (支队伍|条记录|位选手)$/.test((s.textContent || '').trim()))
      return el?.textContent?.trim() ?? ''
    })
    const before = await countText()
    if (!before) throw new Error('未找到统计文案，无法测量搜索交互')
    const t0 = Date.now()
    await input.fill('北京')
    await page.waitForFunction((prev) => {
      const el = [...document.querySelectorAll('span')].find(s => /^共 \d+ (支队伍|条记录|位选手)$/.test((s.textContent || '').trim()))
      return !!el && el.textContent.trim() !== prev
    }, before, { timeout: 5000 })
    metrics['summary-search-update-ms'] = Date.now() - t0
  }
  await ctx.close()
}
const jsBytes = fs.readdirSync('dist/assets').filter(f => f.endsWith('.js')).reduce((s, f) => s + fs.statSync(path.join('dist/assets', f)).size, 0)
metrics.totalJsBytes = jsBytes
fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(metrics, null, 2))
console.log(JSON.stringify(metrics, null, 1))
await browser.close()
