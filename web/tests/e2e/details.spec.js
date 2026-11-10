// 个人页、学校页、数据分析页、轨迹名单页（计划 §6.8–§6.11）
import { test, expect } from '@playwright/test'
import * as po from './po/app.js'
import * as ref from '../reference/views.js'
import { MEDAL_LABELS, medalTier } from '../reference/analysis.js'
import { tiersToCode, TIER_TEXT } from '../reference/trajectory.js'
import { trajectoryRangeText } from '../reference/chartOptions.js'

const years = po.readData('years.json').map(y => y.year)
const loadYear = (y) => po.readData(`${y}/contests.json`).map(c => po.readData(`${y}/${c.id}.json`))
const all2025 = loadYear(2025)
const oi2025 = po.readData('2025/oi_records.json')
const nanjing = po.readData('2025/nanjing.json').sheets['正式队伍']
const champ = { name: nanjing[0].members[0].name, school: nanjing[0].school }

// 同名跨校的选手（用来验证 按姓名 与 按学校+姓名 两种口径的差异）
function findMultiSchoolName(contests) {
  const map = new Map()
  for (const c of contests) for (const t of c.sheets['正式队伍']) for (const m of t.members) {
    if (!map.has(m.name)) map.set(m.name, new Set())
    map.get(m.name).add(t.school)
  }
  for (const [name, schools] of map) if (schools.size >= 2) return { name, school: [...schools][0] }
  return null
}
const multi = findMultiSchoolName(all2025)

// ---------------------------------------------------------------- Player
test.describe('B-PL 个人页', () => {
  test('B-PL4/B-PL6/B-PL7 年度页（按姓名）', async ({ page }) => {
    const exp = ref.playerRecords([{ year: 2025, contests: all2025 }], oi2025, champ.name, '')
    await po.open(page, `/2025/player/${encodeURIComponent(champ.name)}`)
    await expect(po.heading(page)).toHaveText(champ.name)
    await expect(po.main(page).getByText('历年 ICPC/CCPC 获奖记录')).toHaveCount(0)
    await expect(po.main(page).getByText(`ICPC/CCPC (${exp.icpc.length})`)).toBeVisible()
    await expect(po.main(page).getByText(`OI 奖项 (${exp.oi.length})`)).toBeVisible()
    await po.waitRows(page)
    expect(await po.headerTexts(page)).toEqual(['#', '赛区', '学校', '队伍', '排名', '解题', '罚时', '奖牌'])
    await expect(po.tableRows(page)).toHaveCount(exp.icpc.length)
    const r = exp.icpc[0]
    const row = po.tableRows(page).first()
    const cells = await po.rowCellTexts(row)
    expect(cells[1]).toBe(r.contest)
    expect(cells.slice(3)).toEqual([r.team, String(r.rank), String(r.solved), String(r.penalty), MEDAL_LABELS[medalTier(r.medal)]])
    await expect(row.getByRole('link', { name: r.contest })).toHaveAttribute('href', `#/2025/contest/${r.contestId}`)
  })

  test('B-PL8 OI 表', async ({ page }) => {
    const exp = ref.playerRecords([{ year: 2025, contests: all2025 }], oi2025, champ.name, '')
    await po.open(page, `/2025/player/${encodeURIComponent(champ.name)}`)
    await po.main(page).getByText(`OI 奖项 (${exp.oi.length})`).click()
    expect(await po.headerTexts(page)).toEqual(['#', '比赛', '奖项', '年级', '学校'])
    await expect(po.tableRows(page)).toHaveCount(exp.oi.length)
    const cells = await po.rowCellTexts(po.tableRows(page).first())
    expect(cells.slice(1)).toEqual([exp.oi[0]['比赛'], exp.oi[0]['奖项'], exp.oi[0]['年级'], exp.oi[0]['学校']])
  })

  test('B-PL4 同名不同校在年度页合并', async ({ page }) => {
    test.skip(!multi, '数据中无同名跨校选手')
    const exp = ref.playerRecords([{ year: 2025, contests: all2025 }], oi2025, multi.name, '')
    await po.open(page, `/2025/player/${encodeURIComponent(multi.name)}`)
    await expect(po.main(page).getByText(`ICPC/CCPC (${exp.icpc.length})`)).toBeVisible()
  })

  test('B-PL2/B-PL3 scope=all + school：全部年份按学校+姓名', async ({ page }) => {
    test.skip(!multi, '数据中无同名跨校选手')
    const contestYears = years.map(y => ({ year: y, contests: loadYear(y) }))
    const exp = ref.playerRecords(contestYears, oi2025, multi.name, multi.school)
    const q = `scope=all&school=${encodeURIComponent(multi.school)}`
    await po.open(page, `/2025/player/${encodeURIComponent(multi.name)}?${q}`)
    await expect(po.main(page).getByText(`${multi.school} · 历年 ICPC/CCPC 获奖记录`)).toBeVisible({ timeout: 60000 })
    await expect(po.main(page).getByText(`ICPC/CCPC (${exp.icpc.length})`)).toBeVisible()
    await expect(po.main(page).getByText(`OI 奖项 (${exp.oi.length})`)).toBeVisible()
    const r = exp.icpc[0]
    const row = po.tableRows(page).first()
    await expect(row).toContainText(`${r.year} 年`)
    await expect(row.getByRole('link', { name: r.school })).toHaveAttribute('href', `#/${r.year}/school/${encodeURIComponent(r.school)}`)
  })

  test('B-PL9 未知姓名显示空表而非 404', async ({ page }) => {
    await po.open(page, `/2025/player/${encodeURIComponent('不存在的选手名')}`)
    await expect(po.heading(page)).toHaveText('不存在的选手名')
    await expect(po.main(page).getByText('ICPC/CCPC (0)')).toBeVisible()
  })

  test('B-PL3 加载失败提示', async ({ page }) => {
    await page.route('**/data/2025/oi_records.json', r => r.fulfill({ status: 500, body: 'x' }))
    await po.open(page, `/2025/player/${encodeURIComponent(champ.name)}`)
    await expect(po.resultSubtitle(page)).toHaveText('选手数据加载失败，请稍后重试')
  })
})

// ---------------------------------------------------------------- School
test.describe('B-SC 学校页', () => {
  test('B-SC2/B-SC3/B-SC4 统计与表格', async ({ page }) => {
    const teams = ref.schoolTeams(all2025, champ.school)
    const stats = ref.schoolStats(teams)
    await po.open(page, `/2025/school/${encodeURIComponent(champ.school)}`)
    await expect(po.heading(page)).toHaveText(champ.school)
    await expect(po.main(page)).toContainText(`参赛队伍: ${stats.count}`)
    await expect(po.main(page)).toContainText(`最佳排名: #${stats.bestRank}`)
    await po.waitRows(page)
    expect(await po.headerTexts(page)).toEqual(['比赛名', '排名', '学校', '队伍', '选手1', '选手2', '选手3'])
    await expect(po.tableRows(page)).toHaveCount(teams.length)
    const cells = await po.rowCellTexts(po.tableRows(page).first())
    expect(cells[0]).toBe(teams[0]._contest)
    expect(cells[1]).toBe(String(teams[0].rank))
    await po.tableRows(page).first().getByText(teams[0].team, { exact: true }).click()
    await expect(po.dialog(page)).toContainText(`${teams[0].school} — ${teams[0].team}`)
  })

  test('B-SC5 未知学校：0 支队伍，最佳排名 —', async ({ page }) => {
    await po.open(page, `/2025/school/${encodeURIComponent('不存在的学校')}`)
    await expect(po.heading(page)).toHaveText('不存在的学校')
    await expect(po.main(page)).toContainText('参赛队伍: 0')
    await expect(po.main(page)).toContainText('最佳排名: —')
  })
})

test.describe('D3 学校全无排名显示 —（M4 启用）', () => {
  test.fixme('全部队伍缺排名时最佳排名为 —', async ({ page }) => {
    const index = po.readData('2025/contests.json')
    for (const c of index) {
      await page.route(`**/data/2025/${c.id}.json`, async (r) => {
        const body = po.readData(`2025/${c.id}.json`)
        body.sheets['正式队伍'] = body.sheets['正式队伍'].map(t => t.school === champ.school ? { ...t, rank: 0 } : t)
        await r.fulfill({ json: body })
      })
    }
    await po.open(page, `/2025/school/${encodeURIComponent(champ.school)}`)
    await expect(po.main(page)).toContainText('最佳排名: —')
  })
})

test.describe('D7 名称只解码一次（M4 启用）', () => {
  const weird = '百分%之百大学'
  test.fixme('学校名含 % 可正常打开', async ({ page }) => {
    await po.open(page, `/2025/school/${encodeURIComponent(weird)}`)
    await expect(po.heading(page)).toHaveText(weird)
  })
  test.fixme('选手名含 % 可正常打开', async ({ page }) => {
    await po.open(page, `/2025/player/${encodeURIComponent('张%三')}`)
    await expect(po.heading(page)).toHaveText('张%三')
  })
})

// ---------------------------------------------------------------- Analysis
const TABS = [['总览', 'overview'], ['赛站分析', 'region'], ['选手分析', 'players'], ['轨迹分析', 'trajectory'], ['OIer 分析', 'oier'], ['学校分析', 'school']]
const traj2026 = po.readData('2026/trajectories.json')

test.describe('B-A 数据分析', () => {
  test('B-A1 标签顺序与 URL 同步', async ({ page }) => {
    await po.open(page, '/2025/analysis')
    await expect(po.heading(page)).toContainText('数据分析')
    await expect(po.tabs(page).first()).toBeVisible({ timeout: 60000 })
    expect((await po.tabs(page).allInnerTexts()).map(s => s.trim())).toEqual(TABS.map(t => t[0]))
    await expect(po.tab(page, '总览')).toHaveAttribute('aria-selected', 'true')
    await po.tab(page, '学校分析').evaluate(el => el.click())
    await expect(page).toHaveURL(/tab=school/)
    await po.tab(page, '赛站分析').evaluate(el => el.click())
    await expect(page).toHaveURL(/tab=region/)
    // replace 不新增历史：后退回到进入分析页之前
    await page.goBack()
    await expect(page).not.toHaveURL(/analysis/)
  })

  test('B-A1 ?tab 恢复与非法值回退', async ({ page }) => {
    await po.open(page, '/2025/analysis?tab=oier')
    await expect(po.tab(page, 'OIer 分析')).toHaveAttribute('aria-selected', 'true', { timeout: 60000 })
    await page.goto('./#/2025/analysis?tab=bogus')
    await expect(po.tab(page, '总览')).toHaveAttribute('aria-selected', 'true', { timeout: 60000 })
  })

  test('B-A1 浏览器前进/后退恢复 Tab', async ({ page }) => {
    await po.open(page, '/2025/analysis?tab=players')
    await expect(po.tab(page, '选手分析')).toHaveAttribute('aria-selected', 'true', { timeout: 60000 })
    await page.goto('./#/2025/analysis?tab=school')
    await expect(po.tab(page, '学校分析')).toHaveAttribute('aria-selected', 'true')
    await page.goBack()
    await expect(po.tab(page, '选手分析')).toHaveAttribute('aria-selected', 'true')
  })

  test('B-A2 轨迹数据失败只影响对应区域', async ({ page }) => {
    await page.route('**/data/2026/trajectories.json', r => r.fulfill({ status: 500, body: 'x' }))
    await po.open(page, '/2026/analysis?tab=trajectory')
    await expect(po.tabPanel(page, 'trajectory')).toContainText('轨迹数据暂不可用', { timeout: 60000 })
    await po.tab(page, '选手分析').evaluate(el => el.click())
    await expect(po.tabPanel(page, 'players')).toContainText('第一次最高获奖数据暂不可用')
    await expect(po.tabPanel(page, 'players')).toContainText('选手获奖分布')
  })

  test('B-A2 主体加载失败', async ({ page }) => {
    await page.route('**/data/2025/contests.json', r => r.fulfill({ status: 500, body: 'x' }))
    await po.open(page, '/2025/analysis')
    await expect(po.resultSubtitle(page)).toHaveText('数据加载失败，请稍后重试')
  })

  test('B-A4 各 Tab 主要区块标题', async ({ page }) => {
    await po.open(page, '/2025/analysis')
    await expect(po.tabs(page).first()).toBeVisible({ timeout: 60000 })
    const expectTitles = {
      overview: ['各赛区队伍奖牌分布', '奖牌发放数（CCPC / ICPC）', '赛区数', 'OIer 选手'],
      region: ['各赛站获奖人数', '仅统计还参加过其他赛站的选手'],
      players: ['选手获奖分布', '参赛场次与获奖率', '第一次最高获奖', '多场选手的排名稳定性', '各奖牌档稳定性汇总'],
      trajectory: ['五年奖牌轨迹'],
      oier: ['各奖牌档选手的 OIer 占比', '各奖牌档队伍的 OIer 人数构成', '各奖牌档选手的最高 OI 奖项分布', '奖项等级：IOI > NOI > WC 级 > 提高 > 入门'],
      school: ['各学校层次选手的奖牌分布', '各学校层次获奖率与 OIer 率', '学校层次概览', '本年无金牌的 985 院校', '本年有金牌的 211 院校', '本年有金牌的双非院校'],
    }
    for (const [label, key] of TABS) {
      await po.tab(page, label).evaluate(el => el.click())
      for (const text of expectTitles[key]) await expect(po.tabPanel(page, key)).toContainText(text)
    }
  })

  test('B-A6 轨迹表三态排序与行跳转', async ({ page }) => {
    await po.open(page, '/2026/analysis?tab=trajectory')
    const panel = po.trajectoryTable(page)
    await expect(panel.locator('tbody tr').first()).toBeVisible({ timeout: 60000 })
    const rangeText = trajectoryRangeText(traj2026)
    await expect(panel).toContainText(`统计范围 ${rangeText}`)
    await expect(panel.locator('tbody tr')).toHaveCount(traj2026.rows.length)
    const firstCells = async () => po.rowCellTexts(panel.locator('tbody tr').first())
    const defaultFirst = traj2026.rows[0].tiers.map(t => TIER_TEXT[t])
    expect((await firstCells()).slice(0, 5)).toEqual(defaultFirst)
    // 升序：第一年 \ 最小 → 但数据中第一年不会是 none，取最小 tier
    const ORDER = { none: 0, iron: 1, bronze: 2, silver: 3, gold: 4 }
    const asc = traj2026.rows.slice().sort((a, b) => ORDER[a.tiers[0]] - ORDER[b.tiers[0]])
    const desc = traj2026.rows.slice().sort((a, b) => ORDER[b.tiers[0]] - ORDER[a.tiers[0]])
    await po.clickHeader(page, panel, '第一年')
    expect((await firstCells())[0]).toBe(TIER_TEXT[asc[0].tiers[0]])
    await po.clickHeader(page, panel, '第一年')
    expect((await firstCells())[0]).toBe(TIER_TEXT[desc[0].tiers[0]])
    await po.clickHeader(page, panel, '第一年')
    expect((await firstCells()).slice(0, 5)).toEqual(defaultFirst)
    // 行点击进入名单页
    await panel.locator('tbody tr').first().click()
    await expect(page).toHaveURL(new RegExp(`#/2026/trajectory/${tiersToCode(traj2026.rows[0].tiers)}$`))
  })

  test('B-A5 散点点击跳转个人页（真实鼠标）', async ({ page }) => {
    await po.open(page, '/2025/analysis?tab=players')
    const panel = po.tabPanel(page, 'players')
    await expect(panel).toContainText('多场选手的排名稳定性', { timeout: 60000 })
    const pt = await po.findScatterPoint(page, panel)
    expect(pt, '应能在散点图上找到数据点').toBeTruthy()
    await page.mouse.click(pt.x, pt.y)
    await expect(page).toHaveURL(/#\/2025\/player\//)
  })
})

test.describe('D5 轨迹行与散点为真实链接（M5 启用）', () => {
  test.fixme('轨迹行含指向名单页的链接', async ({ page }) => {
    await po.open(page, '/2026/analysis?tab=trajectory')
    const panel = po.trajectoryTable(page)
    const link = panel.locator('tbody tr').first().getByRole('link')
    await expect(link).toHaveAttribute('href', `#/2026/trajectory/${tiersToCode(traj2026.rows[0].tiers)}`)
  })
  test.fixme('Ctrl+点击散点在新标签打开', async ({ page, context }) => {
    await po.open(page, '/2025/analysis?tab=players')
    const panel = po.tabPanel(page, 'players')
    await expect(panel).toContainText('多场选手的排名稳定性', { timeout: 60000 })
    const pt = await po.findScatterPoint(page, panel)
    const pagePromise = context.waitForEvent('page')
    await page.keyboard.down('Control')
    await page.mouse.click(pt.x, pt.y)
    await page.keyboard.up('Control')
    const newPage = await pagePromise
    await expect(newPage).toHaveURL(/#\/2025\/player\//)
    await expect(page).toHaveURL(/analysis/)
  })
})

// ---------------------------------------------------------------- Trajectory detail
test.describe('B-T 轨迹名单页', () => {
  const row = traj2026.rows.find(r => r.count <= 5) ?? traj2026.rows[0]
  const code = tiersToCode(row.tiers)

  test('B-T1/B-T3 内容与链接', async ({ page }) => {
    await po.open(page, `/2026/trajectory/${code}`)
    await expect(po.main(page).getByRole('link', { name: '← 返回数据分析' })).toHaveAttribute('href', '#/2026/analysis?tab=trajectory')
    await expect(po.heading(page)).toHaveText('轨迹选手名单')
    await expect(po.main(page)).toContainText(`仅统计 ${traj2026.window[1]} 年获奖（金/银/铜）的选手`)
    await expect(po.tableRows(page)).toHaveCount(row.players.length)
    const [school, name] = row.players[0]
    const cells = await po.rowCellTexts(po.tableRows(page).first())
    expect(cells).toEqual([school, name])
    const href = await po.tableRows(page).first().getByRole('link', { name }).getAttribute('href')
    expect(href).toBe(`#/2026/player/${encodeURIComponent(name)}?scope=all&school=${encodeURIComponent(school)}`)
  })

  test('B-T2 无效编码', async ({ page }) => {
    await po.open(page, '/2026/trajectory/x')
    await expect(po.resultTitle(page)).toHaveText('轨迹编码无效')
    await expect(po.resultSubtitle(page)).toHaveText('URL 中的轨迹格式不正确')
  })

  test('B-T2 未找到轨迹', async ({ page }) => {
    const codes = new Set(traj2026.rows.map(r => tiersToCode(r.tiers)))
    const missing = ['g-g-g-g-g', 'i-i-i-i-i', 'n-n-n-n-n'].find(c => !codes.has(c))
    await po.open(page, `/2026/trajectory/${missing}`)
    await expect(po.resultTitle(page)).toHaveText('未找到该轨迹')
    await expect(po.resultSubtitle(page)).toHaveText('该轨迹人数为 0 或数据已更新')
  })

  test('B-T2 数据加载失败', async ({ page }) => {
    await page.route('**/data/2026/trajectories.json', r => r.fulfill({ status: 500, body: 'x' }))
    await po.open(page, `/2026/trajectory/${code}`)
    await expect(po.resultTitle(page)).toHaveText('加载失败')
    await expect(po.resultSubtitle(page)).toHaveText('轨迹数据暂不可用')
  })
})
