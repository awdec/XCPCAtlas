/**
 * Lighthouse 模拟 4G 指标（计划 M6-T5 / 审查遗留项）。
 * 用法：先 `npm run build && npm run preview`，再 `node scripts/lighthouse.mjs [输出文件]`。
 * 默认使用 Lighthouse 移动端配置：模拟 4G（150 ms RTT / 1.6 Mbps / 4x CPU 降速）。
 * 浏览器默认复用 Playwright 的 Chromium；也可用 CHROME_PATH 指定。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'

const BASE = process.env.LH_BASE || 'http://localhost:4173/XCPCAtlas/'
const OUT = process.argv[2] || 'tests/visual/lighthouse.json'
const ROUTES = [
  ['home', '/'],
  ['contest', '/2025/contest/nanjing'],
  ['summary', '/2025/summary'],
  ['analysis', '/2025/analysis'],
]

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const root = process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA || '', 'ms-playwright')
    : path.join(os.homedir(), '.cache', 'ms-playwright')
  const exe = process.platform === 'win32' ? 'chrome-win64/chrome.exe' : 'chrome-linux/chrome'
  if (!fs.existsSync(root)) return undefined
  const dirs = fs.readdirSync(root).filter(d => d.startsWith('chromium-')).sort().reverse()
  for (const d of dirs) {
    const p = path.join(root, d, exe)
    if (fs.existsSync(p)) return p
  }
  return undefined
}

const chromePath = findChrome()
if (!chromePath) {
  console.error('找不到 Chromium：设置 CHROME_PATH，或先运行 npx playwright install chromium')
  process.exit(1)
}

const chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] })
const results = {}
try {
  for (const [name, route] of ROUTES) {
    const runner = await lighthouse(`${BASE}#${route}`, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance'],
    })
    const a = runner.lhr.audits
    results[name] = {
      route,
      performance: Math.round((runner.lhr.categories.performance?.score ?? 0) * 100),
      lcpMs: Math.round(a['largest-contentful-paint']?.numericValue ?? 0),
      fcpMs: Math.round(a['first-contentful-paint']?.numericValue ?? 0),
      tbtMs: Math.round(a['total-blocking-time']?.numericValue ?? 0),
      cls: Number((a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(4)),
      speedIndexMs: Math.round(a['speed-index']?.numericValue ?? 0),
    }
    console.log(name.padEnd(9), JSON.stringify(results[name]))
  }
} finally {
  await chrome.kill()
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(results, null, 2))
console.log('written', OUT)
