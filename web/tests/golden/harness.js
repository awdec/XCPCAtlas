/**
 * Golden 基线计算框架（M0-T3）。
 *
 * computeAll(impl, year) 用给定实现（impl）对一个年份跑完所有业务计算，返回
 * { name -> 可序列化结果 }。gen-golden.mjs 用 reference 实现生成基线；
 * golden.test.js 用当前实现重算并逐项比较。M1 起 impl 切换到 src/domain。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = path.resolve(here, '../../public/data')
export const GOLDEN_DIR = path.resolve(here, '__golden__')
const HASH_THRESHOLD = 20_000

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

export function loadYearFiles(year) {
  const index = readJSON(path.join(DATA_DIR, String(year), 'contests.json'))
  const contests = index.map(c => readJSON(path.join(DATA_DIR, String(year), `${c.id}.json`)))
  const oiPath = path.join(DATA_DIR, String(year), 'oi_records.json')
  const trajPath = path.join(DATA_DIR, String(year), 'trajectories.json')
  return {
    index,
    contests,
    oi: fs.existsSync(oiPath) ? readJSON(oiPath) : {},
    trajectories: fs.existsSync(trajPath) ? readJSON(trajPath) : null,
  }
}

export function loadGlobal() {
  return {
    years: readJSON(path.join(DATA_DIR, 'years.json')),
    tags: {
      set985: new Set(readJSON(path.join(DATA_DIR, '985.json'))),
      set211: new Set(readJSON(path.join(DATA_DIR, '211.json'))),
    },
  }
}

// ---------- 序列化：Set→有序数组；函数→标记；非有限数→字符串；数组顺序永不改变 ----------
export function canonical(value) {
  if (value instanceof Set) return { __set__: [...value].map(canonical).sort() }
  if (value instanceof Map) return { __map__: [...value.entries()].map(([k, v]) => [k, canonical(v)]) }
  if (typeof value === 'function') return '[Function]'
  if (typeof value === 'number' && !Number.isFinite(value)) return `__num__${value}`
  if (value === undefined) return '__undefined__'
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) out[k] = canonical(value[k])
    return out
  }
  return value
}

export function pack(value) {
  const json = JSON.stringify(canonical(value))
  if (json.length <= HASH_THRESHOLD) return JSON.parse(json)
  const parsed = JSON.parse(json)
  const summary = Array.isArray(parsed)
    ? { count: parsed.length, head: JSON.stringify(parsed.slice(0, 2)).slice(0, 2000) }
    : { keys: Object.keys(parsed) }
  return { __hashed__: true, sha256: crypto.createHash('sha256').update(json).digest('hex'), length: json.length, ...summary }
}

// ---------- formatter 采样：用 option 自身数据构造 ECharts 回调参数 ----------
const valueOf = (d) => (d && typeof d === 'object' && !Array.isArray(d) ? d.value : d)

function axisParams(option, i) {
  const xData = option.xAxis?.data ?? option.yAxis?.data
  return option.series.map((s, si) => ({
    seriesIndex: si,
    seriesName: s.name,
    dataIndex: i,
    value: valueOf(s.data[i]),
    marker: `<m${si}>`,
    axisValue: xData?.[i],
  }))
}

export function sampleFormatters(option) {
  const out = {}
  const tip = option.tooltip
  if (typeof tip?.formatter === 'function') {
    if (tip.trigger === 'axis') {
      const n = option.series[0]?.data?.length ?? 0
      const idx = [...new Set([0, Math.floor(n / 2), n - 1])].filter(i => i >= 0 && i < n)
      out.tooltip = idx.map(i => tip.formatter(axisParams(option, i)))
    } else {
      const s0 = option.series[0]
      if (s0.type === 'pie') {
        out.tooltip = s0.data.map(d => tip.formatter({ name: d.name, value: d.value, percent: 12.3 }))
      } else if (s0.type === 'heatmap') {
        out.tooltip = s0.data.slice(0, 16).map(d => tip.formatter({ value: d }))
      } else {
        out.tooltip = option.series.flatMap(s => s.data.slice(0, 3)).map(d => tip.formatter({ data: d }))
      }
    }
  }
  if (typeof tip?.valueFormatter === 'function') out.valueFormatter = [tip.valueFormatter(12.5)]
  option.series.forEach((s, si) => {
    if (typeof s.label?.formatter === 'function') {
      out[`label${si}`] = s.data.slice(0, 4).map(d => s.label.formatter(s.type === 'heatmap' ? { value: d } : { value: valueOf(d) }))
    }
  })
  if (typeof option.visualMap?.formatter === 'function') out.visualMap = [option.visualMap.formatter(37.5)]
  return out
}

const chart = (option) => ({ option: canonical(option), formatters: sampleFormatters(option) })

// ---------- 选手抽样：前 5 个赛区排名第一队伍的第一名队员 ----------
export function samplePlayers(contests) {
  const out = []
  for (const c of contests.slice(0, 5)) {
    const rows = c.sheets['正式队伍'] || []
    const top = rows.find(r => r.rank === 1) || rows[0]
    if (top?.members?.[0]) out.push({ name: top.members[0].name, school: top.school })
  }
  return out
}

const EMPTY_F = { contest: '', school: '', team: '', member: '', player: '', schoolType: '', oiCount: '', medal: '', gold: '', silver: '', bronze: '', oi: '' }
const FILTER_CASES = [
  {},
  { school: '  北京大学 ' },
  { school: '大学', team: 'a' },
  { member: '王' },
  { schoolType: '985' }, { schoolType: '211' }, { schoolType: 'other' },
  { oiCount: 0 }, { oiCount: 3 }, { oiCount: '' },
  { medal: 'gold' }, { medal: 'silver' }, { medal: 'bronze' }, { medal: 'other' },
  { schoolType: '211', oiCount: 1, medal: 'bronze' },
]
const PLAYER_FILTER_CASES = [
  {}, { school: '清华' }, { player: '李' }, { schoolType: '211' },
  { gold: 0 }, { gold: 2 }, { silver: 1 }, { bronze: 3 }, { oi: 'yes' }, { oi: 'no' },
  { schoolType: 'other', gold: 1, oi: 'yes' },
]

const keyRows = (rows) => rows.map(r => `${r.contestName ?? ''}|${r.rank ?? ''}|${r.school}|${r.team ?? r.name}`)

/**
 * impl = { analysis, trajectory, formatters, views, charts }
 */
export function computeAll(impl, year, files, global) {
  const { analysis: A, trajectory: T, formatters: F, views: V, charts: C } = impl
  const { contests, oi, trajectories } = files
  const { tags, years } = global
  const out = {}

  // --- analysis.js ---
  const dataset = A.buildYearDataset(contests)
  out.dataset = dataset
  const overview = A.computeOverview(dataset)
  out.overview = overview
  const region = A.computeRegionStats(dataset)
  out.regionStats = region
  const players = A.computePlayerStats(dataset)
  out.playerStats = players
  const oier = A.computeOIerStats(dataset)
  out.oierStats = oier
  const school = A.computeSchoolStats(dataset, tags)
  out.schoolStats = school

  const regionIds = [null, ...C.oierRegionOptions(dataset).map(r => r.id)]
  out.oierRegionOptions = C.oierRegionOptions(dataset)
  out.oiAwards = {}
  for (const rid of regionIds) {
    for (const tier of ['gold', 'silver', 'bronze']) {
      const s = A.computeOIAwardStats(dataset, rid, tier)
      out.oiAwards[`${rid ?? 'all'}:${tier}`] = { stats: s, chart: s.items.length ? chart(C.oierAwardOption(s)) : null, height: C.oierAwardChartHeight(s) }
    }
  }

  // --- 图表 option ---
  out.charts = {
    overviewCards: C.overviewCards(overview),
    overviewRegion: chart(C.overviewRegionOption(overview)),
    regionPerSite: chart(C.regionPerSiteOption(region)),
    playersPie: chart(C.playersPieOption(players)),
    playersPart: chart(C.playersPartOption(players)),
    playersScatter: chart(C.playersScatterOption(players)),
    playersAgg: C.playersAggRows(players),
    playersFirstBest: C.playersFirstBestRows(trajectories),
    playersFirstBestMissing: C.playersFirstBestRows(null),
    oierPlayerRate: chart(C.oierPlayerRateOption(oier)),
    oierTeamComp: chart(C.oierTeamCompOption(oier)),
    schoolDistribution: chart(C.schoolDistributionOption(school)),
    schoolRate: chart(C.schoolRateOption(school)),
    schoolTierSummary: C.schoolTierSummary(school),
    trajectoryRange: C.trajectoryRangeText(trajectories),
  }
  out.migration = {}
  for (const r of region.perSite) {
    const rows = C.regionMigrationRows(region, r.regionId)
    out.migration[r.regionId] = {
      rows,
      cellText: rows.map(row => row.cells.map(C.regionCellText)),
      chart: chart(C.regionMatrixOption(rows)),
    }
  }

  // --- 轨迹 ---
  if (trajectories) {
    out.trajectoryCodes = trajectories.rows.map(r => {
      const code = T.tiersToCode(r.tiers)
      return { code, back: T.codeToTiers(code) }
    })
    const rows = trajectories.rows.map((r, i) => ({ ...r, players: undefined, _i: i }))
    out.trajectorySort = {}
    for (let i = 0; i < 5; i++) {
      const asc = rows.slice().sort(C.trajectoryYearSortMethod(i)).map(r => r._i)
      out.trajectorySort[`y${i}`] = asc
    }
  }
  out.codeToTiersInvalid = ['', 'x', 'g-g-g-g', 'g-g-g-g-g-g', 'g-g-g-g-x', 'G-g-g-g-g'].map(c => T.codeToTiers(c))

  // --- 视图内联逻辑 ---
  const sRows = V.summaryRows(contests)
  out.summaryRows = sRows
  out.summaryContestOptions = V.summaryContestOptions(sRows)
  out.summaryFilter = FILTER_CASES.map(f => keyRows(V.summaryFilter(sRows, { ...EMPTY_F, ...f }, tags)))
  out.summaryMedal = ['Gold', 'Silver', 'Bronze', 'Honorable', undefined, 'gold medal'].map(m => [V.summaryMedalOrder(m), V.summaryMedalLabel(m), V.summaryMedalClass(m), V.rowMedalClass(m)])

  out.contestFilter = {}
  for (const c of contests) {
    const teams = c.sheets['正式队伍'] || []
    out.contestFilter[c.id] = FILTER_CASES.map(f => keyRows(V.contestFilter(teams, { ...EMPTY_F, ...f }, tags)).length)
  }

  const board = V.playerBoard(contests)
  out.playerBoard = board
  out.playersFilter = PLAYER_FILTER_CASES.map(f => keyRows(V.playersFilter(board, { ...EMPTY_F, ...f }, tags)))

  const contestYears = [{ year: Number(year), contests }]
  out.playerRecords = samplePlayers(contests).map(({ name, school: sch }) => ({
    name,
    school: sch,
    byName: V.playerRecords(contestYears, oi, name, ''),
    bySchool: V.playerRecords(contestYears, oi, name, sch),
  }))
  // 全部年份口径（scope=all）在 golden.test 中单独构建（需跨年数据），这里只记年份列表
  out.years = years.map(y => y.year)

  const schoolNames = [...new Set(contests.flatMap(c => (c.sheets['正式队伍'] || []).slice(0, 3).map(t => t.school)))].slice(0, 8)
  out.schoolPages = schoolNames.map(name => {
    const teams = V.schoolTeams(contests, name)
    return { name, keys: teams.map(t => `${t._contest}|${t.rank}|${t.team}`), stats: V.schoolStats(teams) }
  })
  out.schoolPageUnknown = V.schoolStats(V.schoolTeams(contests, '__不存在的学校__'))

  // --- formatters.js ---
  const probs = contests[0].sheets['正式队伍'].slice(0, 3).flatMap(t => Object.values(t.problems))
  out.formatters = {
    submission: [...probs, null, { status: 'none' }, { status: 'solved', attempts: 1, time: 5 }, { status: 'solved', attempts: 3, time: 50 }, { status: 'unsolved', attempts: 4 }, { status: 'weird' }]
      .map(p => [F.formatSubmission(p), F.problemClass(p)]),
    medal: ['Gold', 'Silver', 'Bronze', 'Honorable', '', null].map(m => [F.medalClass(m), F.medalText(m)]),
  }
  out.medalTier = ['Gold', 'SILVER', 'bronze', 'Honorable', '', null, undefined].map(A.medalTier)
  out.fmtPct = [0, 1, 0.5, 0.889, 1 / 3, NaN, Infinity].map(A.fmtPct)
  out.parseOIAward = [
    ['NOI2023', '金牌'], ['NOI2023', '国际金牌'], ['CSP2022入门', '三等奖'], ['CSP2023提高', '二等奖'],
    ['NOIP2023', '一等奖'], ['APIO2021', '国际金牌'], ['CTSC2020', '银牌'], ['NOI夏令营2021', '铜牌'],
    ['IOI2022', '金牌'], ['未知比赛2020', '金牌'], ['NOI2023', '优秀奖'], ['NOID类2022', '二等奖'],
  ].map(([c, a]) => A.parseOIAward(c, a))

  // --- 分页 ---
  out.pageButtons = [[1, 0], [1, 1], [1, 2], [1, 40], [5, 40], [17, 40], [40, 40], [3, 3], [33, 100]].map(([c, t]) => V.pageButtons(c, t))
  out.intro = [[null, 1e12], ['', 1e12], ['abc', 1e12], [String(1e12), 1e12 + 6 * 864e5], [String(1e12), 1e12 + 7 * 864e5], [String(1e12), 1e12 + 7 * 864e5 + 1]]
    .map(([s, now]) => V.shouldShowIntro(s, now))

  return out
}

// scope=all：所有年份数据中按 学校+姓名 检索，OI 读页面年份
export function computeAllYearsPlayer(impl, pageYear, name, school, allYearFiles, pageOi) {
  const contestYears = allYearFiles.map(({ year, contests }) => ({ year, contests }))
  return impl.views.playerRecords(contestYears, pageOi, name, school)
}

export function packAll(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) out[k] = pack(v)
  return out
}
