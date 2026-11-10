/**
 * 页面对象：E2E 用到的全部选择器集中在这里。
 * 重构替换 UI 组件库时只改本文件，spec 不动（计划 M0-T4）。
 */
import { expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../public/data')
export const readData = (rel) => JSON.parse(fs.readFileSync(path.join(DATA, rel), 'utf8'))

/** 打开 hash 路由；默认先写入介绍弹窗已读，避免弹窗遮挡 */
export async function open(page, hash, { introSeen = true } = {}) {
  if (introSeen) {
    await page.addInitScript(() => {
      try { localStorage.setItem('xcpc_intro_seen_v1', String(Date.now())) } catch { /* ignore */ }
    })
  }
  await page.goto(`./#${hash}`)
}

export const header = (page) => page.locator('header')
export const siteTitle = (page) => header(page).locator('h1').first()
/** D5：标题区域为指向首页的真实链接 */
export const logoLink = (page) => header(page).getByRole('link', { name: /ICPC\/CCPC 比赛结果/ })
export const navLink = (page, label) => header(page).getByRole('link', { name: label })
export const main = (page) => page.locator('main')
export const heading = (page) => main(page).locator('h2').first()

/** 数据表格的数据行（不含表头） */
export const tableRows = (page, scope) => (scope ?? main(page)).locator('tbody tr')
export const headerCells = (page, scope) => (scope ?? main(page)).locator('thead th')
export async function headerTexts(page, scope) {
  return (await headerCells(page, scope).allInnerTexts()).map(t => t.trim()).filter(Boolean)
}
export async function rowCellTexts(row) {
  return (await row.locator('td').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim())
}
export async function waitRows(page, scope) {
  await expect(tableRows(page, scope).first()).toBeVisible({ timeout: 60000 })
}

export const searchInput = (page, placeholder) => main(page).getByPlaceholder(placeholder, { exact: true })

/** 下拉筛选：按占位文本找到选择框，选中指定选项 */
export async function chooseSelect(page, placeholder, optionLabel) {
  const select = main(page).locator('.el-select').filter({ has: page.locator('.el-select__placeholder', { hasText: placeholder }) }).first()
  await select.click()
  await page.locator('.el-select-dropdown__item:visible', { hasText: optionLabel }).filter({ hasText: new RegExp(`^\\s*${escapeRe(optionLabel)}\\s*$`) }).first().click()
}
/** 读取下拉的全部选项文本（打开后读取，再按 Esc 关闭） */
export async function selectOptions(page, placeholder) {
  const select = main(page).locator('.el-select').filter({ has: page.locator('.el-select__placeholder', { hasText: placeholder }) }).first()
  await select.click()
  const items = page.locator('.el-select-dropdown__item:visible')
  await expect(items.first()).toBeVisible()
  const texts = (await items.allInnerTexts()).map(t => t.trim())
  await page.keyboard.press('Escape')
  return texts
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 分页按钮（二进制偏移页码） */
export const pager = (page) => main(page).locator('div').filter({ has: page.locator('span', { hasText: /^每页/ }) }).last()
export const pagerButtons = (page) => pager(page).locator('button')
export async function pagerNumbers(page) {
  return (await pagerButtons(page).allInnerTexts()).map(t => Number(t.trim()))
}
export async function clickPage(page, n) {
  await pagerButtons(page).filter({ hasText: new RegExp(`^\\s*${n}\\s*$`) }).click()
  await expect(currentPage(page)).toHaveText(String(n))
}
/** 当前页按钮（旧实现：bg-blue-600；新实现：aria-current="page"） */
export const currentPage = (page) => pager(page).locator('button.bg-blue-600, button[aria-current="page"]')
export const pagerText = (page) => pager(page).locator('span').first()

/** 统计文案（共 n 支队伍 / 条记录 / 位选手） */
export const countText = (page) => main(page).locator('span', { hasText: /^共 \d+ (支队伍|条记录|位选手)$/ })

/** 加载/错误结果 */
export const resultTitle = (page) => main(page).locator('.el-result__title')
export const resultSubtitle = (page) => main(page).locator('.el-result__subtitle')

/** 弹窗 */
export const dialog = (page) => page.getByRole('dialog')

/** 数据分析页 */
export const tabs = (page) => main(page).getByRole('tab')
export const tab = (page, name) => main(page).getByRole('tab', { name, exact: true })
export const tabPanel = (page, key) => main(page).locator(`#pane-${key}`)
/** 轨迹表在轨迹 tab 内 */
export const trajectoryTable = (page) => tabPanel(page, 'trajectory')
export async function clickHeader(page, scope, label) {
  await scope.locator('thead th', { hasText: label }).first().click()
}

/** 进度文案 */
export const progressText = (page) => main(page).getByText(/正在加载比赛数据（\d+ \/ \d+）/)

/**
 * 在「多场选手的排名稳定性」散点图中找一个数据点的屏幕坐标。
 * 生产构建不暴露 ECharts 实例，改为读取 canvas 像素：找奖牌色（金/银/铜，75% 透明度）的像素团中心。
 * 只依赖 Canvas 渲染器，新旧实现通用。
 */
export async function findScatterPoint(page, panel) {
  const card = panel.locator('div', { has: page.locator('h3', { hasText: '多场选手的排名稳定性' }) }).last()
  const canvas = card.locator('canvas').first()
  await canvas.scrollIntoViewIfNeeded()
  await page.waitForTimeout(800) // 等入场动画结束
  return canvas.evaluate((cv) => {
    const ctx = cv.getContext('2d')
    const { width, height } = cv
    const img = ctx.getImageData(0, 0, width, height).data
    const rect = cv.getBoundingClientRect()
    const sx = rect.width / width
    const sy = rect.height / height
    // canvas 背景透明，像素即奖牌原色（金 #e6a23c / 铜 #b3703c）+ alpha
    const targets = [[230, 162, 60], [179, 112, 60]]
    const near = (i, [r, g, b]) => img[i + 3] > 150 && Math.abs(img[i] - r) < 6 && Math.abs(img[i + 1] - g) < 6 && Math.abs(img[i + 2] - b) < 6
    for (const t of targets) {
      for (let y = Math.floor(height * 0.15); y < height * 0.85; y += 2) {
        for (let x = Math.floor(width * 0.1); x < width * 0.95; x += 2) {
          const i = (y * width + x) * 4
          if (!near(i, t)) continue
          // 要求周围也是同色（点中心），避开图例小图标
          const ok = [[3, 0], [-3, 0], [0, 3], [0, -3]].every(([dx, dy]) => near(((y + dy) * width + (x + dx)) * 4, t))
          if (ok) return { x: rect.left + x * sx, y: rect.top + y * sy }
        }
      }
    }
    return null
  })
}
