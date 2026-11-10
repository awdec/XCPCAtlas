// 全局外壳、首页、年份页、公告（计划 §6.1 / §6.2 / §6.3 / §6.13）
import { test, expect } from '@playwright/test'
import * as po from './po/app.js'
import { shouldShowIntro } from '../reference/views.js'

const years = po.readData('years.json')
const contests2025 = po.readData('2025/contests.json')

test.describe('B-G 全局外壳', () => {
  test('B-G3 无年份时标题', async ({ page }) => {
    await po.open(page, '/')
    await expect(po.siteTitle(page)).toHaveText('ICPC/CCPC 比赛结果')
  })

  test('B-G3/B-G4 年份路由下标题与导航', async ({ page }) => {
    await po.open(page, '/2025/')
    await expect(po.siteTitle(page)).toHaveText('2025 ICPC/CCPC 比赛结果')
    const expected = [
      ['年份选择', '/'], ['公告', '/announcement'],
      ['赛区列表', '/2025/'], ['全部成绩', '/2025/summary'], ['选手成绩', '/2025/players'], ['数据分析', '/2025/analysis'],
    ]
    for (const [label, path] of expected) {
      await expect(po.navLink(page, label)).toHaveAttribute('href', `#${path}`)
    }
  })

  test('B-G4 无年份时不显示年份导航', async ({ page }) => {
    await po.open(page, '/announcement')
    await expect(po.navLink(page, '赛区列表')).toHaveCount(0)
    await expect(po.navLink(page, '公告')).toBeVisible()
  })

  test('B-G4 当前项按路径精确匹配高亮', async ({ page }) => {
    await po.open(page, '/2025/summary')
    await expect(po.navLink(page, '全部成绩')).toHaveAttribute('aria-current', 'page')
    await expect(po.navLink(page, '赛区列表')).not.toHaveAttribute('aria-current', 'page')
  })

  for (const bad of ['2019', '2031', 'abc', 'foo']) {
    test(`B-G2 非法年份 ${bad} 重定向首页`, async ({ page }) => {
      await po.open(page, `/${bad}/`)
      await expect(page).toHaveURL(/#\/$/)
      await expect(po.heading(page)).toHaveText('ICPC/CCPC 比赛结果')
    })
  }

  test('B-G2 非法年份对深层路由同样生效', async ({ page }) => {
    await po.open(page, '/1999/contest/nanjing')
    await expect(page).toHaveURL(/#\/$/)
  })

  test('B-G5 文档标题', async ({ page }) => {
    await po.open(page, '/2025/')
    await expect(page).toHaveTitle('ICPC/CCPC 比赛结果')
  })
})

test.describe('B-H 首页', () => {
  test('B-H1/B-H3 年份卡片', async ({ page }) => {
    await po.open(page, '/')
    await expect(po.heading(page)).toHaveText('ICPC/CCPC 比赛结果')
    await expect(po.main(page).getByText('选择年份查看各赛区比赛结果')).toBeVisible()
    for (const y of years) {
      const card = po.main(page).locator(`a[href="#/${y.year}/"]`)
      await expect(card).toContainText(String(y.year))
      await expect(card).toContainText(`${y.contest_count} 个赛区`)
      await expect(card).toContainText(`${y.total_teams} 支队伍`)
      await expect(card).toContainText('查看详情 →')
    }
    const order = await po.main(page).locator('a[href^="#/20"]').evaluateAll(as => as.map(a => a.getAttribute('href')))
    expect(order).toEqual(years.map(y => `#/${y.year}/`))
  })

  test('B-H4 判定函数边界（参考实现）', () => {
    const now = 1e12
    expect(shouldShowIntro(null, now)).toBe(true)
    expect(shouldShowIntro('abc', now)).toBe(true)
    expect(shouldShowIntro(String(now - 6 * 864e5), now)).toBe(false)
    expect(shouldShowIntro(String(now - 7 * 864e5), now)).toBe(false)
    expect(shouldShowIntro(String(now - 7 * 864e5 - 1), now)).toBe(true)
  })

  test('B-H4 首次访问弹出，只能用「知道了」关闭并写入时间戳', async ({ page }) => {
    await po.open(page, '/', { introSeen: false })
    const dlg = po.dialog(page)
    await expect(dlg).toBeVisible()
    await expect(dlg).toContainText('网站说明')
    await expect(dlg).toContainText('本平台收录了 2020-2026 赛季 ICPC/CCPC 各赛区的比赛结果')
    await page.keyboard.press('Escape')
    await expect(dlg).toBeVisible()
    await page.mouse.click(5, 5)
    await expect(dlg).toBeVisible()
    await expect(dlg.getByRole('button', { name: /关闭|Close/ })).toHaveCount(0)
    await dlg.getByRole('button', { name: '知道了' }).click()
    await expect(dlg).toBeHidden()
    const stored = await page.evaluate(() => localStorage.getItem('xcpc_intro_seen_v1'))
    expect(Number(stored)).toBeGreaterThan(Date.now() - 60000)
  })

  test('B-H4 6 天内不再弹出，超过 7 天再弹', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-10T00:00:00Z') })
    const now = await page.evaluate(() => Date.now())
    await page.addInitScript((t) => localStorage.setItem('xcpc_intro_seen_v1', String(t)), now - 6 * 864e5)
    await page.goto('./#/')
    await expect(po.heading(page)).toBeVisible()
    await expect(po.dialog(page)).toBeHidden()
  })

  test('B-H4 超过 7 天再次弹出', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-10T00:00:00Z') })
    const now = await page.evaluate(() => Date.now())
    await page.addInitScript((t) => localStorage.setItem('xcpc_intro_seen_v1', String(t)), now - 8 * 864e5)
    await page.goto('./#/')
    await expect(po.dialog(page)).toBeVisible()
  })

  test('B-H4 localStorage 抛错时静默弹出且可关闭', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked') } })
    })
    await page.goto('./#/')
    const dlg = po.dialog(page)
    await expect(dlg).toBeVisible()
    await dlg.getByRole('button', { name: '知道了' }).click()
    await expect(dlg).toBeHidden()
    await expect(po.main(page).locator('a[href="#/2025/"]')).toBeVisible()
  })

  test('@mobile 首页在手机宽度可用', async ({ page }) => {
    await po.open(page, '/')
    await expect(po.main(page).locator('a[href="#/2025/"]')).toBeVisible()
  })
})

test.describe('B-Y 年份页', () => {
  test('B-Y1/B-Y2 赛区卡片', async ({ page }) => {
    await po.open(page, '/2025/')
    await expect(po.heading(page)).toHaveText('2025 赛季各赛区比赛结果')
    await expect(po.main(page).getByText(`共 ${contests2025.length} 个赛区，点击卡片查看详情`)).toBeVisible()
    const hrefs = await po.main(page).locator('a[href*="/contest/"]').evaluateAll(as => as.map(a => a.getAttribute('href')))
    expect(hrefs).toEqual(contests2025.map(c => `#/2025/contest/${c.id}`))
    const c = contests2025[0]
    const card = po.main(page).locator(`a[href="#/2025/contest/${c.id}"]`)
    await expect(card).toContainText(c.name)
    await expect(card).toContainText(c.org)
    await expect(card).toContainText('🥇 冠军')
    await expect(card).toContainText(c.champion.school)
    await expect(card).toContainText(`${c.champion.solved} 题`)
    await expect(card).toContainText(`罚时 ${c.champion.penalty}`)
  })

  test('B-Y3 切换年份重新加载', async ({ page }) => {
    await po.open(page, '/2025/')
    await expect(po.heading(page)).toHaveText('2025 赛季各赛区比赛结果')
    await page.goto('./#/2024/')
    await expect(po.heading(page)).toHaveText('2024 赛季各赛区比赛结果')
    const n = po.readData('2024/contests.json').length
    await expect(po.main(page).locator('a[href*="/contest/"]')).toHaveCount(n)
  })
})

test.describe('B-AN 公告', () => {
  test('B-AN1 五条公告原文', async ({ page }) => {
    await po.open(page, '/announcement')
    await expect(po.heading(page)).toContainText('公告')
    for (const title of ['网站说明', '关于作者', '功能说明', '985 的特殊说明', 'OIer 判定规则说明']) {
      await expect(po.main(page).locator('h3', { hasText: title })).toBeVisible()
    }
    await expect(po.main(page)).toContainText('QQ 1120571672 或 微信 ice998244353')
    await expect(po.main(page)).toContainText('选手名右侧有 ☀️ 标识的为 OIer。')
  })
})

test.describe('D2 404 页面（M2 启用）', () => {
  test('B-N1 未知路径显示 404', async ({ page }) => {
    for (const p of ['/2025/unknown', '/2025/contest', '/a/b/c/d']) {
      await po.open(page, p)
      await expect(po.main(page)).toContainText('页面不存在')
      await expect(po.main(page)).toContainText('您访问的页面不存在或已被移除')
      await expect(po.main(page).getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '#/')
      await expect(po.main(page).getByRole('link', { name: '查看公告' })).toHaveAttribute('href', '#/announcement')
    }
  })
})

test.describe('D5 Logo 为真实链接（M2 启用）', () => {
  test('Logo 是指向首页的链接', async ({ page }) => {
    await po.open(page, '/2025/summary')
    await expect(po.logoLink(page)).toHaveAttribute('href', '#/')
  })
})
