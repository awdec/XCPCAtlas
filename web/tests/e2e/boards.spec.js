// 榜单类页面：Contest / Summary / Players（计划 §6.4–§6.7）
// 期望值全部由冻结的参考实现（tests/reference）从数据文件算出，不写死数字。
import { test, expect } from '@playwright/test'
import * as po from './po/app.js'
import * as ref from '../reference/views.js'
import { formatSubmission } from '../reference/formatters.js'

const tags = { set985: new Set(po.readData('985.json')), set211: new Set(po.readData('211.json')) }
const nanjing = po.readData('2025/nanjing.json')
const nanjingTeams = nanjing.sheets['正式队伍']
const index2025 = po.readData('2025/contests.json')
const all2025 = index2025.map(c => po.readData(`2025/${c.id}.json`))
const summary2025 = ref.summaryRows(all2025)
const board2025 = ref.playerBoard(all2025)

const EMPTY = { contest: '', school: '', team: '', member: '', player: '', schoolType: '', oiCount: '', medal: '', gold: '', silver: '', bronze: '', oi: '' }

async function firstRowCells(page) {
  return po.rowCellTexts(po.tableRows(page).first())
}

// ---------------------------------------------------------------- Contest
test.describe('B-C 赛区榜单 /2025/contest/nanjing', () => {
  test.beforeEach(async ({ page }) => {
    await po.open(page, '/2025/contest/nanjing')
    await po.waitRows(page)
  })

  test('B-C3/B-C5 标题、列与首行', async ({ page }) => {
    await expect(po.heading(page)).toHaveText(nanjing.name)
    await expect(po.main(page)).toContainText(nanjing.org)
    expect(await po.headerTexts(page)).toEqual(['队排', '校排', '学校', '队伍', '选手1', '选手2', '选手3'])
    const t = nanjingTeams[0]
    const cells = await firstRowCells(page)
    expect(cells[0]).toBe(String(t.rank))
    expect(cells[1]).toBe(t.org_rank == null ? '' : String(t.org_rank))
    expect(cells[2]).toContain(t.school)
    expect(cells[3]).toBe(t.team)
    t.members.forEach((m, i) => expect(cells[4 + i]).toContain(m.name))
  })

  test('B-F8/B-F7 计数与分页（每页 100）', async ({ page }) => {
    const n = nanjingTeams.length
    const total = Math.ceil(n / 100)
    await expect(po.countText(page)).toHaveText(`共 ${n} 支队伍`)
    await expect(po.tableRows(page)).toHaveCount(Math.min(100, n))
    await expect(po.pagerText(page)).toHaveText(`每页 100 条，共 ${total} 页`)
    expect(await po.pagerNumbers(page)).toEqual(ref.pageButtons(1, total))
    // 二进制偏移页码：从第 1 页不一定能直达末页，逐级点最大页码
    while (!(await po.pagerNumbers(page)).includes(total)) {
      await po.clickPage(page, Math.max(...await po.pagerNumbers(page)))
    }
    await po.clickPage(page, total)
    await expect(po.tableRows(page)).toHaveCount(n - (total - 1) * 100)
    expect(await po.pagerNumbers(page)).toEqual(ref.pageButtons(total, total))
    const lastCells = await firstRowCells(page)
    expect(lastCells[0]).toBe(String(nanjingTeams[(total - 1) * 100].rank))
  })

  const cases = [
    ['搜索学校 trim+大小写', async (page) => { await po.searchInput(page, '搜索学校').fill('  北京大学 ') }, { school: '  北京大学 ' }],
    ['搜索队员', async (page) => { await po.searchInput(page, '搜索队员').fill('王') }, { member: '王' }],
    ['搜索队伍', async (page) => { await po.searchInput(page, '搜索队伍').fill('a') }, { team: 'a' }],
    ['学校类型 211 排除 985', async (page) => { await po.chooseSelect(page, '学校类型', '211') }, { schoolType: '211' }],
    ['学校类型 其他', async (page) => { await po.chooseSelect(page, '学校类型', '其他') }, { schoolType: 'other' }],
    ['OI 人数 0', async (page) => { await po.chooseSelect(page, 'OI 人数', '0 人') }, { oiCount: 0 }],
    ['OI 人数 3', async (page) => { await po.chooseSelect(page, 'OI 人数', '3 人') }, { oiCount: 3 }],
  ]
  for (const [name, act, f] of cases) {
    test(`B-F 筛选：${name}`, async ({ page }) => {
      const expected = ref.contestFilter(nanjingTeams, { ...EMPTY, ...f }, tags)
      await act(page)
      await expect(po.countText(page)).toHaveText(`共 ${expected.length} 支队伍`)
      if (expected.length) {
        const cells = await firstRowCells(page)
        expect(cells[0]).toBe(String(expected[0].rank))
        expect(cells[3]).toBe(expected[0].team)
      }
    })
  }

  test('B-F6 筛选变化回到第 1 页', async ({ page }) => {
    await po.clickPage(page, 2)
    expect((await firstRowCells(page))[0]).toBe(String(nanjingTeams[100].rank))
    await po.chooseSelect(page, '学校类型', '其他')
    const expected = ref.contestFilter(nanjingTeams, { ...EMPTY, schoolType: 'other' }, tags)
    await expect(po.tableRows(page).first().locator('td').first()).toHaveText(String(expected[0].rank))
    await expect(po.currentPage(page)).toHaveText('1')
  })

  test('B-F2 搜索防抖 300ms', async ({ page }) => {
    await po.searchInput(page, '搜索学校').fill('北京大学')
    // 输入框立即回显
    await expect(po.searchInput(page, '搜索学校')).toHaveValue('北京大学')
    const expected = ref.contestFilter(nanjingTeams, { ...EMPTY, school: '北京大学' }, tags)
    await expect(po.countText(page)).toHaveText(`共 ${expected.length} 支队伍`)
  })

  test('B-F9/B-C7 学校标签、OIer 标识与链接', async ({ page }) => {
    const t = nanjingTeams[0]
    const row = po.tableRows(page).first()
    const tag = tags.set985.has(t.school) ? '985' : tags.set211.has(t.school) ? '211' : null
    if (tag) await expect(row.locator('td').nth(2)).toContainText(tag)
    await expect(row.getByRole('link', { name: t.school })).toHaveAttribute('href', `#/2025/school/${encodeURIComponent(t.school)}`)
    const m = t.members[0]
    const link = row.getByRole('link', { name: m.name, exact: true })
    await expect(link).toHaveAttribute('href', `#/2025/player/${encodeURIComponent(m.name)}`)
    if (m.oi.length) {
      await expect(row.locator('td').nth(4)).toContainText('☀️')
      const tip = page.getByText(`${m.oi[0]['比赛']} · ${m.oi[0]['奖项']}`).first()
      await link.hover()
      await expect(tip).toBeVisible()
      // 键盘聚焦同样打开提示（B-C7 / 审查 P2-5）
      await page.mouse.move(0, 0)
      await expect(tip).toBeHidden()
      await link.focus()
      await expect(tip).toBeVisible()
    }
    const noOi = nanjingTeams.flatMap(x => x.members).find(x => !x.oi.length)
    expect(noOi).toBeTruthy()
  })

  test('B-C6 奖牌行底色', async ({ page }) => {
    const idx = { gold: nanjingTeams.findIndex(t => /gold/i.test(t.medal || '')) }
    const goldRow = po.tableRows(page).nth(idx.gold)
    const bg = await goldRow.locator('td').nth(1).evaluate(el => getComputedStyle(el).backgroundColor)
    expect(['rgb(253, 246, 227)', 'rgb(250, 240, 212)']).toContain(bg)
  })

  test('B-C8 队伍详情弹窗', async ({ page }) => {
    const t = nanjingTeams[0]
    await po.tableRows(page).first().getByText(t.team, { exact: true }).click()
    const dlg = po.dialog(page)
    await expect(dlg).toBeVisible()
    await expect(dlg).toContainText(`${t.school} — ${t.team}`)
    await expect(dlg).toContainText(`#${t.rank}`)
    await expect(dlg).toContainText('解题数')
    await expect(dlg).toContainText(String(t.penalty))
    await expect(dlg).toContainText('🥇 金牌')
    await expect(dlg).toContainText('题目状态')
    for (const [letter, p] of Object.entries(t.problems)) {
      await expect(dlg).toContainText(letter)
      await expect(dlg).toContainText(formatSubmission(p))
      if (p.status === 'solved') await expect(dlg).toContainText(`${p.time}min / ${p.attempts}次`)
    }
    for (const m of t.members) await expect(dlg).toContainText(m.name)
    if (t.coaches?.length) await expect(dlg).toContainText(`教练: ${t.coaches.join(', ')}`)
    await page.keyboard.press('Escape')
    await expect(dlg).toBeHidden()
  })

  test('B-C7 点击单元格内链接不触发队伍弹窗', async ({ page }) => {
    const t = nanjingTeams[0]
    await po.tableRows(page).first().getByRole('link', { name: t.school }).click()
    await expect(page).toHaveURL(new RegExp(`/school/${encodeURIComponent(t.school)}`))
    await expect(po.dialog(page)).toBeHidden()
  })
})

test('B-C2 加载失败提示', async ({ page }) => {
  await page.route('**/data/2025/nanjing.json', r => r.fulfill({ status: 500, body: 'x' }))
  await po.open(page, '/2025/contest/nanjing')
  await expect(po.resultTitle(page)).toHaveText('加载失败')
  await expect(po.resultSubtitle(page)).toHaveText('赛区数据加载失败，请稍后重试')
})

test.describe('D2 未知赛区（M3 启用）', () => {
  test('B-N2 未知赛区 id 显示「赛区不存在」', async ({ page }) => {
    await po.open(page, '/2025/contest/no-such-contest')
    await expect(po.main(page)).toContainText('赛区不存在')
    await expect(po.main(page)).toContainText('2025 赛季没有该赛区')
    await expect(po.main(page).getByRole('link', { name: '返回赛区列表' })).toHaveAttribute('href', '#/2025/')
  })
})

// ---------------------------------------------------------------- Summary
test.describe('B-S 全部成绩 /2025/summary', () => {
  test.beforeEach(async ({ page }) => {
    await po.open(page, '/2025/summary')
    await po.waitRows(page)
  })

  test('B-S1/B-S3/B-S5 标题、列、首行顺序', async ({ page }) => {
    await expect(po.heading(page)).toHaveText('2025 年全部成绩汇总')
    expect(await po.headerTexts(page)).toEqual(['比赛名', '排名', '学校', '队伍名', '选手 1', '选手 2', '选手 3', '奖项'])
    await expect(po.countText(page)).toHaveText(`共 ${summary2025.length} 条记录`)
    const total = Math.ceil(summary2025.length / 20)
    await expect(po.pagerText(page)).toHaveText(`每页 20 条，共 ${summary2025.length} 条，${total} 页`)
    await expect(po.tableRows(page)).toHaveCount(20)
    for (let i = 0; i < 3; i++) {
      const cells = await po.rowCellTexts(po.tableRows(page).nth(i))
      const r = summary2025[i]
      expect(cells[0]).toBe(r.contestName)
      expect(cells[1]).toBe(String(r.rank))
      expect(cells[3]).toBe(r.team)
      expect(cells[7]).toBe(ref.summaryMedalLabel(r.medal))
    }
  })

  test('B-S6 整行文字按奖牌着色', async ({ page }) => {
    await po.expectRowTextTone(po.tableRows(page).first(), 'gold')
  })

  const cases = [
    ['奖项 其他', async (page) => po.chooseSelect(page, '奖项', '其他'), { medal: 'other' }],
    ['奖项 铜牌', async (page) => po.chooseSelect(page, '奖项', '🥉 铜牌'), { medal: 'bronze' }],
    ['比赛', async (page) => po.chooseSelect(page, '比赛', index2025[2].name), { contest: index2025[2].name }],
    ['学校类型 985', async (page) => po.chooseSelect(page, '学校类型', '985'), { schoolType: '985' }],
    ['OI 人数 2', async (page) => po.chooseSelect(page, 'OI 人数', '2 人'), { oiCount: 2 }],
    ['搜索队员', async (page) => po.searchInput(page, '搜索队员').fill('张'), { member: '张' }],
  ]
  for (const [name, act, f] of cases) {
    test(`B-S4 筛选：${name}`, async ({ page }) => {
      const expected = ref.summaryFilter(summary2025, { ...EMPTY, ...f }, tags)
      await act(page)
      await expect(po.countText(page)).toHaveText(`共 ${expected.length} 条记录`)
      const cells = await po.rowCellTexts(po.tableRows(page).first())
      expect(cells[0]).toBe(expected[0].contestName)
      expect(cells[3]).toBe(expected[0].team)
    })
  }

  test('B-S4 比赛下拉选项顺序', async ({ page }) => {
    const opts = await po.selectOptions(page, '比赛')
    expect(opts.map(s => s.trim())).toEqual(ref.summaryContestOptions(summary2025))
  })
})

test('B-S2 Summary 加载失败提示', async ({ page }) => {
  await page.route('**/data/2025/contests.json', r => r.fulfill({ status: 500, body: 'x' }))
  await po.open(page, '/2025/summary')
  await expect(po.resultTitle(page)).toHaveText('加载失败')
  await expect(po.resultSubtitle(page)).toHaveText('数据加载失败，请稍后重试')
})

test('B-S2 Summary 顺序加载并显示进度', async ({ page }) => {
  const order = []
  await page.route('**/data/2025/*.json', async (r) => {
    const name = r.request().url().split('/').pop()
    order.push(name)
    if (name !== 'contests.json') await new Promise(res => setTimeout(res, 150))
    await r.continue()
  })
  await po.open(page, '/2025/summary')
  await expect(po.progressText(page)).toBeVisible()
  await po.waitRows(page)
  const files = order.filter(n => n !== 'contests.json')
  expect(files).toEqual(index2025.map(c => `${c.id}.json`))
})

test.describe('D1 去掉 120ms 等待（M4 启用）', () => {
  test('B-S2 每个文件之间无人为等待', async ({ page }) => {
    const times = []
    await page.route('**/data/2025/*.json', async (r) => {
      times.push(Date.now())
      await r.continue()
    })
    await po.open(page, '/2025/summary')
    await po.waitRows(page)
    const gaps = times.slice(2).map((t, i) => t - times[i + 1])
    // 旧实现每个文件后至少等待 120ms；去掉后间隔只剩解析/调度开销
    expect(gaps.filter(g => g >= 120).length).toBeLessThan(gaps.length / 2)
  })
})

test.describe('D4 Summary/Players 搜索防抖（M4 启用）', () => {
  test('Summary 搜索在 300ms 内不触发筛选', async ({ page }) => {
    await po.open(page, '/2025/summary')
    await po.waitRows(page)
    await page.clock.install()
    await po.searchInput(page, '搜索学校').fill('北京大学')
    await expect(po.countText(page)).toHaveText(`共 ${summary2025.length} 条记录`)
    await page.clock.runFor(350)
    const expected = ref.summaryFilter(summary2025, { ...EMPTY, school: '北京大学' }, tags)
    await expect(po.countText(page)).toHaveText(`共 ${expected.length} 条记录`)
  })
  test('Players 搜索在 300ms 内不触发筛选', async ({ page }) => {
    await po.open(page, '/2025/players')
    await po.waitRows(page)
    await page.clock.install()
    await po.searchInput(page, '搜索选手').fill('李')
    await expect(po.countText(page)).toHaveText(`共 ${board2025.length} 位选手`)
    await page.clock.runFor(350)
    const expected = ref.playersFilter(board2025, { ...EMPTY, player: '李' }, tags)
    await expect(po.countText(page)).toHaveText(`共 ${expected.length} 位选手`)
  })
})

// ---------------------------------------------------------------- Players
test.describe('B-P 选手成绩 /2025/players', () => {
  test.beforeEach(async ({ page }) => {
    await po.open(page, '/2025/players')
    await po.waitRows(page)
  })

  test('B-P1/B-P2/B-P4 标题、列、排序', async ({ page }) => {
    await expect(po.heading(page)).toHaveText('2025 年选手成绩汇总')
    expect(await po.headerTexts(page)).toEqual(['学校', '选手', '🥇 金牌', '🥈 银牌', '🥉 铜牌', 'Honorable'])
    await expect(po.countText(page)).toHaveText(`共 ${board2025.length} 位选手`)
    for (let i = 0; i < 5; i++) {
      const cells = await po.rowCellTexts(po.tableRows(page).nth(i))
      const r = board2025[i]
      expect(cells[0]).toContain(r.school)
      expect(cells[1]).toContain(r.name)
      expect(cells.slice(2)).toEqual([r.gold, r.silver, r.bronze, r.honorable].map(String))
    }
  })

  const cases = [
    ['金牌 ≥ 2', async (page) => po.chooseSelect(page, '金牌 ≥', '≥ 2'), { gold: 2 }],
    ['铜牌 ≥ 0', async (page) => po.chooseSelect(page, '铜牌 ≥', '≥ 0'), { bronze: 0 }],
    ['有 OI 奖项', async (page) => po.chooseSelect(page, 'OI 奖项', '有 OI 奖项'), { oi: 'yes' }],
    ['无 OI 奖项', async (page) => po.chooseSelect(page, 'OI 奖项', '无 OI 奖项'), { oi: 'no' }],
    ['学校类型 其他', async (page) => po.chooseSelect(page, '学校类型', '其他'), { schoolType: 'other' }],
    ['搜索学校', async (page) => po.searchInput(page, '搜索学校').fill('清华'), { school: '清华' }],
  ]
  for (const [name, act, f] of cases) {
    test(`B-P3 筛选：${name}`, async ({ page }) => {
      const expected = ref.playersFilter(board2025, { ...EMPTY, ...f }, tags)
      await act(page)
      await expect(po.countText(page)).toHaveText(`共 ${expected.length} 位选手`)
      const cells = await po.rowCellTexts(po.tableRows(page).first())
      expect(cells[1]).toContain(expected[0].name)
    })
  }

  test('B-F7 中间页的页码集合', async ({ page }) => {
    const total = Math.ceil(board2025.length / 20)
    for (const target of [2, 4, 8]) {
      await po.clickPage(page, target)
    }
    // 1→2→4→8 之后到达第 8 页
    expect(await po.pagerNumbers(page)).toEqual(ref.pageButtons(8, total))
  })
})
