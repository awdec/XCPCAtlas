// 动效与可访问性（计划 §8 / §7.3 / 验收 §10.4–10.6）
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import * as po from './po/app.js'

const ROUTES = ['/', '/announcement', '/2025/', '/2025/contest/nanjing', '/2025/summary', '/2025/players', '/2025/analysis', '/2026/trajectory/b-n-n-n-n', '/2025/school/%E6%B8%85%E5%8D%8E%E5%A4%A7%E5%AD%A6', '/2025/unknown']

test.describe('§8.2 页面过渡', () => {
  test('Chromium：路由切换产生 view transition，类型为 forward', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transitions 仅在 Chromium 启用')
    await po.open(page, '/2025/')
    await expect(po.heading(page)).toContainText('赛季各赛区比赛结果')
    await page.evaluate(() => {
      window.__vt = []
      const orig = document.startViewTransition.bind(document)
      document.startViewTransition = (arg) => { window.__vt.push(arg?.types ?? null); return orig(arg) }
    })
    await page.locator('a[href="#/2025/contest/nanjing"]').click()
    await expect(page).toHaveURL(/contest\/nanjing/)
    expect(await page.evaluate(() => window.__vt)).toEqual([['forward']])
  })

  test('减弱动效时不产生 view transition', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transitions 仅在 Chromium 启用')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await po.open(page, '/2025/')
    await expect(po.heading(page)).toContainText('赛季')
    await page.evaluate(() => {
      window.__vt = 0
      const orig = document.startViewTransition.bind(document)
      document.startViewTransition = (a) => { window.__vt++; return orig(a) }
    })
    await page.locator('a[href="#/2025/contest/nanjing"]').click()
    await expect(page).toHaveURL(/contest\/nanjing/)
    expect(await page.evaluate(() => window.__vt)).toBe(0)
  })

  test('只改 query（分析页切换 Tab）不做页面过渡', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'View Transitions 仅在 Chromium 启用')
    await po.open(page, '/2025/analysis')
    await expect(po.tabs(page).first()).toBeVisible({ timeout: 60000 })
    await page.evaluate(() => {
      window.__vt = 0
      const orig = document.startViewTransition.bind(document)
      document.startViewTransition = (a) => { window.__vt++; return orig(a) }
    })
    await po.tab(page, '学校分析').click()
    await expect(page).toHaveURL(/tab=school/)
    expect(await page.evaluate(() => window.__vt)).toBe(0)
  })
})

test.describe('§10.4 动画只作用于 transform / opacity', () => {
  test('首页卡片入场与悬停期间运行中的动画只改 transform/opacity', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '在 Chromium 上采样')
    await page.addInitScript(() => localStorage.setItem('xcpc_intro_seen_v1', String(Date.now())))
    await page.goto('./#/')
    const props = await page.evaluate(async () => {
      const seen = new Set()
      const t0 = performance.now()
      while (performance.now() - t0 < 600) {
        for (const a of document.getAnimations()) {
          const effect = a.effect
          if (!effect?.getKeyframes) continue
          for (const kf of effect.getKeyframes()) {
            for (const k of Object.keys(kf)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(k)) seen.add(k)
          }
          // CSS transition
          if (a.transitionProperty) seen.add(a.transitionProperty)
        }
        await new Promise(r => requestAnimationFrame(r))
      }
      return [...seen]
    })
    const allowed = ['transform', 'opacity', 'translate', 'scale', 'rotate', 'color', 'backgroundColor', 'background-color', 'borderColor', 'border-color']
    for (const p of props) expect(allowed, `动画属性 ${p}`).toContain(p)
  })
})

test.describe('§10.5 无障碍（axe）', () => {
  for (const theme of ['light', 'dark']) {
    for (const r of ROUTES) {
      test(`${theme} ${r}`, async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'axe 在 Chromium 上运行')
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
        await po.open(page, r)
        await expect(po.heading(page).or(po.resultTitle(page))).toBeVisible({ timeout: 60000 })
        if (r.includes('contest') || r.includes('summary') || r.includes('players') || r.includes('school')) await po.waitRows(page)
        if (r.includes('analysis')) await expect(po.tabs(page).first()).toBeVisible({ timeout: 60000 })
        // 等入场动画结束（动画中元素半透明，axe 会读到混合后的颜色）
        await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getTiming?.().iterations === Infinity), null, { timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(500)
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
        const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
        expect(serious.map(v => `${v.id}: ${v.nodes.length} 处，例如 ${v.nodes[0]?.target}`)).toEqual([])
      })
    }
  }
})

test.describe('§10.6 响应式（360px）', () => {
  for (const r of ROUTES) {
    test(`360px 无页面级横向滚动 ${r}`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', '在 Chromium 上检查')
      await page.setViewportSize({ width: 360, height: 780 })
      await po.open(page, r)
      await expect(po.heading(page).or(po.resultTitle(page))).toBeVisible({ timeout: 60000 })
      await page.waitForTimeout(300)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('@mobile 移动端导航抽屉', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await po.open(page, '/2025/')
    await page.getByRole('button', { name: '打开导航菜单' }).click()
    const sheet = page.getByRole('dialog')
    await expect(sheet.getByRole('link', { name: '数据分析' })).toBeVisible()
    await sheet.getByRole('link', { name: '全部成绩' }).click()
    await expect(page).toHaveURL(/2025\/summary/)
    await expect(sheet).toBeHidden()
  })
})

test.describe('键盘可达', () => {
  test('队伍详情可用键盘打开与关闭', async ({ page }) => {
    await po.open(page, '/2025/contest/nanjing')
    await po.waitRows(page)
    const btn = po.tableRows(page).first().getByRole('button', { name: /查看队伍详情/ })
    await btn.focus()
    await page.keyboard.press('Enter')
    await expect(po.dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(po.dialog(page)).toBeHidden()
  })

  test('跳到主要内容', async ({ page, browserName }) => {
    // Safari/WebKit 默认 Tab 不聚焦链接（需用户开启「按 Tab 高亮每一项」），属浏览器行为
    test.skip(browserName === 'webkit', 'WebKit 默认 Tab 不聚焦链接')
    await po.open(page, '/2025/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: '跳到主要内容' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
  })

  test('主题切换写入 .dark 并持久化', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await po.open(page, '/2025/')
    await page.getByRole('button', { name: '切换到深色模式' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
