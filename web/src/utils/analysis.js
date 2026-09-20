/**
 * 数据分析统计模块（纯函数，供数据分析页使用）
 *
 * 口径：
 * - XCPC 选手判重：学校+姓名 双关键字相同才算同一选手（同名跨校者视为不同人，
 *   其学校即键的一部分，无归属歧义）
 * - OIer 判定：沿用预处理阶段（extract_oi_records.py）的 姓名+年龄反推 匹配，
 *   成员内嵌的 oi 数组即为该口径的产物
 * - 选手奖牌档取当年在所有赛区的最高奖牌，无奖牌记为铁牌
 * - 学校层次：985（含公告中的特殊院校）/ 211 / 双非，与学校详情页一致
 */

export const MEDAL_ORDER = ['gold', 'silver', 'bronze', 'iron']
export const MEDAL_LABELS = { gold: '金牌', silver: '银牌', bronze: '铜牌', iron: '铁牌' }
export const MEDAL_COLORS = { gold: '#e6a23c', silver: '#909399', bronze: '#b3703c', iron: '#dcdfe6' }

const TIER_RANK = { gold: 0, silver: 1, bronze: 2, iron: 3 }

export function medalTier(medal) {
  if (!medal) return 'iron'
  const m = medal.toLowerCase()
  if (m.includes('gold')) return 'gold'
  if (m.includes('silver')) return 'silver'
  if (m.includes('bronze')) return 'bronze'
  return 'iron'
}

export function schoolTierOf(school, set985, set211) {
  if (set985.has(school)) return '985'
  if (set211.has(school)) return '211'
  return '双非'
}

/**
 * 构建年份统一数据集
 * @param {Array} contestsData 各赛区数据 [{ id, name, org, sheets }]
 * @returns {{ teams: Array, players: Array }}
 */
export function buildYearDataset(contestsData) {
  const teams = []
  const players = {}

  for (const contest of contestsData) {
    const rows = contest.sheets?.['正式队伍'] || []
    for (const r of rows) {
      const members = r.members || []
      const tier = medalTier(r.medal)
      const team = {
        regionId: contest.id,
        regionName: contest.name,
        org: contest.org,
        rank: r.rank,
        school: r.school,
        team: r.team,
        medal: r.medal,
        tier,
        members,
        oiCount: members.filter(m => m.oi?.length).length,
      }
      teams.push(team)

      for (const m of members) {
        const key = `${m.name}@${r.school}`
        if (!players[key]) {
          players[key] = { key, name: m.name, school: r.school, appearances: 0, bestTier: 'iron', isOIer: false, oi: [] }
        }
        const p = players[key]
        p.appearances++
        if (TIER_RANK[tier] < TIER_RANK[p.bestTier]) p.bestTier = tier
        if (m.oi?.length) {
          p.isOIer = true
          p.oi.push(...m.oi)
        }
      }
    }
  }

  return { teams, players: Object.values(players) }
}

/**
 * 总览统计：卡片数据 + 各赛区奖牌队伍数
 */
export function computeOverview(dataset) {
  const { teams, players } = dataset
  const regionIds = [...new Set(teams.map(t => t.regionId))]

  const medalPlayers = { gold: 0, silver: 0, bronze: 0, iron: 0 }
  let oierPlayers = 0
  for (const p of players) {
    medalPlayers[p.bestTier]++
    if (p.isOIer) oierPlayers++
  }

  const perRegion = regionIds.map(id => {
    const rows = teams.filter(t => t.regionId === id)
    const counts = { gold: 0, silver: 0, bronze: 0, iron: 0 }
    for (const t of rows) counts[t.tier]++
    return { id, name: rows[0]?.regionName || id, ...counts }
  })

  // 分赛事（CCPC/ICPC）发放的金银铜牌总数（队伍口径）
  const byOrg = {}
  for (const t of teams) {
    if (t.tier === 'iron') continue
    if (!byOrg[t.org]) byOrg[t.org] = { gold: 0, silver: 0, bronze: 0 }
    byOrg[t.org][t.tier]++
  }
  const orgs = ['CCPC', 'ICPC'].filter(o => byOrg[o])
    .concat(Object.keys(byOrg).filter(o => !['CCPC', 'ICPC'].includes(o)))
  const orgMedals = orgs.map(org => ({ org, ...byOrg[org] }))

  return {
    contests: regionIds.length,
    teams: teams.length,
    appearances: players.reduce((s, p) => s + p.appearances, 0),
    players: players.length,
    medalPlayers,
    oierPlayers,
    oierRate: players.length ? oierPlayers / players.length : 0,
    perRegion,
    orgMedals,
  }
}

/**
 * OIer 统计：各奖牌档选手 OIer 占比 + 各奖牌档队伍的 OIer 人数构成
 */
export function computeOIerStats(dataset) {
  const { teams, players } = dataset

  const playerTiers = {}
  for (const tier of MEDAL_ORDER) {
    playerTiers[tier] = { total: 0, oier: 0 }
  }
  for (const p of players) {
    playerTiers[p.bestTier].total++
    if (p.isOIer) playerTiers[p.bestTier].oier++
  }
  for (const tier of MEDAL_ORDER) {
    const { total, oier } = playerTiers[tier]
    playerTiers[tier].rate = total ? oier / total : 0
  }

  const teamTiers = {}
  for (const tier of MEDAL_ORDER) {
    teamTiers[tier] = { counts: [0, 0, 0, 0], total: 0 }
  }
  for (const t of teams) {
    const tt = teamTiers[t.tier]
    tt.total++
    tt.counts[Math.min(t.oiCount, 3)]++
  }

  return { playerTiers, teamTiers }
}

/**
 * 学校层次统计：各层次选手奖牌分布、获奖率、无金牌的 985 名单、
 * 有金牌的 211/双非 名单（层次仍按 985 > 211 > 双非 优先级归类）
 */
export function computeSchoolStats(dataset, tags) {
  const { set985, set211 } = tags
  const { teams, players } = dataset

  const tierNames = ['985', '211', '双非']
  const tierStats = {}
  for (const name of tierNames) {
    tierStats[name] = {
      players: { gold: 0, silver: 0, bronze: 0, iron: 0 },
      total: 0,
      oier: 0,
      teams: 0,
      goldTeams: 0,
    }
  }

  for (const p of players) {
    const stat = tierStats[schoolTierOf(p.school, set985, set211)]
    stat.players[p.bestTier]++
    stat.total++
    if (p.isOIer) stat.oier++
  }

  for (const t of teams) {
    const stat = tierStats[schoolTierOf(t.school, set985, set211)]
    stat.teams++
    if (t.tier === 'gold') stat.goldTeams++
  }

  for (const name of tierNames) {
    const stat = tierStats[name]
    const { gold, silver, bronze } = stat.players
    stat.goldRate = stat.total ? gold / stat.total : 0
    stat.medalRate = stat.total ? (gold + silver + bronze) / stat.total : 0
    stat.oierRate = stat.total ? stat.oier / stat.total : 0
  }

  // 参赛过但全年无金牌的 985 院校
  const schools985 = new Set(teams.filter(t => set985.has(t.school)).map(t => t.school))
  const noGold985 = [...schools985]
    .filter(school => !teams.some(t => t.school === school && t.tier === 'gold'))
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))

  // 本年有金牌的 211 / 双非 院校（有金牌队伍即有参赛资格，无需再过滤参赛）
  const goldSchools = { '211': [], '双非': [] }
  const schoolsWithGold = new Set(teams.filter(t => t.tier === 'gold').map(t => t.school))
  for (const school of schoolsWithGold) {
    const tier = schoolTierOf(school, set985, set211)
    if (tier in goldSchools) goldSchools[tier].push(school)
  }
  for (const list of Object.values(goldSchools)) list.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))

  return { tierNames, tierStats, noGold985, goldSchools }
}

/**
 * 百分比格式化：88.9%（整百分位省略小数）
 */
export function fmtPct(fraction) {
  if (!Number.isFinite(fraction)) return '-'
  const v = fraction * 100
  return (Number.isInteger(v) ? v : v.toFixed(1)) + '%'
}

// ---------- 选手维度统计（选手分析 Tab） ----------

/**
 * 选手统计：获奖分布、参赛场次×无奖牌率、多场选手排名稳定性
 */
export function computePlayerStats(dataset) {
  const { teams, players } = dataset

  const tierCounts = { gold: 0, silver: 0, bronze: 0, iron: 0 }
  for (const p of players) tierCounts[p.bestTier]++

  // 参赛场次分桶：1 / 2 / 3 / 4 场及以上
  const buckets = [1, 2, 3].map(n => ({ label: `${n} 场`, n: 0, iron: 0 }))
  buckets.push({ label: '4 场及以上', n: 0, iron: 0 })
  for (const p of players) {
    const b = p.appearances <= 3 ? buckets[p.appearances - 1] : buckets[3]
    b.n++
    if (p.bestTier === 'iron') b.iron++
  }
  for (const b of buckets) b.ironRate = b.n ? b.iron / b.n : 0

  // 排名稳定性：仅统计参加 ≥2 场且有有效排名的选手
  const ranksByPlayer = new Map()
  for (const t of teams) {
    if (!(t.rank > 0)) continue
    for (const m of t.members) {
      const key = `${m.name}@${t.school}`
      if (!ranksByPlayer.has(key)) ranksByPlayer.set(key, [])
      ranksByPlayer.get(key).push(t.rank)
    }
  }
  const stability = []
  for (const p of players) {
    const ranks = ranksByPlayer.get(p.key)
    if (!ranks || ranks.length < 2) continue
    const mean = ranks.reduce((s, v) => s + v, 0) / ranks.length
    const variance = ranks.reduce((s, v) => s + (v - mean) ** 2, 0) / ranks.length
    stability.push({
      name: p.name,
      school: p.school,
      tier: p.bestTier,
      n: ranks.length,
      mean,
      std: Math.sqrt(variance),
      range: Math.max(...ranks) - Math.min(...ranks),
    })
  }
  const tierAgg = {}
  for (const tier of MEDAL_ORDER) tierAgg[tier] = { n: 0, sumRange: 0, sumStd: 0 }
  for (const s of stability) {
    const a = tierAgg[s.tier]
    a.n++
    a.sumRange += s.range
    a.sumStd += s.std
  }
  const stabilityAgg = MEDAL_ORDER.map(tier => ({
    tier,
    n: tierAgg[tier].n,
    avgRange: tierAgg[tier].n ? tierAgg[tier].sumRange / tierAgg[tier].n : 0,
    avgStd: tierAgg[tier].n ? tierAgg[tier].sumStd / tierAgg[tier].n : 0,
  }))

  return { tierCounts, participation: buckets, stability, stabilityAgg }
}

// ---------- OI 最高奖项统计（OIer 分析 Tab） ----------

// 比赛名去掉年份后的家族 → 等级（文章阶梯：CSP-J < CSP-S/NOIP/春季测试 < WC/APIO < NOI < IOI；
// 用户决策 2026-09：CTSC 从 NOI 层移入 WC/APIO 层）
const OI_FAMILY_LEVEL = {
  CSP入门: 0, NOIP普及: 0,
  CSP提高: 1, NOIP: 1, NOIP提高: 1, 春季测试: 1, NGOI: 1,
  WC: 2, APIO: 2, APIO线上: 2, CTS: 2, CTSC: 2,
  NOI: 3, NOI夏令营: 3, NOID类: 3,
  IOI: 4,
}
// 展示名归一（其余家族用原名）
const OI_FAMILY_LABEL = {
  CSP入门: '入门', NOIP普及: '入门',
  CSP提高: '提高', NOIP: '提高', NOIP提高: '提高', 春季测试: '提高', NGOI: '提高',
  CTS: 'CTSC', NOID类: 'NOI D类',
}
// 同档展示合并（用户决策 2026-09）：WC/APIO/CTSC→"WC 级"、NOI夏令营→NOI
//（国际金按 rank 0 单行展示，同样参与家族合并，如 "WC 级 国际金"）
const OI_MERGE_FAMILY = { WC: 'WC 级', APIO: 'WC 级', APIO线上: 'WC 级', CTS: 'WC 级', CTSC: 'WC 级', NOI夏令营: 'NOI' }

/**
 * 解析一条 OI 记录为可比等级；无法识别的比赛或奖项返回 null
 * 等级内排序：金/一等(1) < 银/二等(2) < 铜/三等(3)
 */
export function parseOIAward(compName, award) {
  const famRaw = compName.replace(/\d{4}/g, '')
  const level = OI_FAMILY_LEVEL[famRaw]
  if (level == null) return null
  const fam = OI_FAMILY_LABEL[famRaw] || famRaw
  // "国际"视作比赛届别名（用户决策 2026-09）：国际金牌 即 金牌
  const normalizedAward = award.replace(/国际/g, '')
  let rank, short
  if (/金|一等/.test(normalizedAward)) { rank = 1; short = normalizedAward.includes('等') ? '一等' : '金' }
  else if (/银|二等/.test(normalizedAward)) { rank = 2; short = normalizedAward.includes('等') ? '二等' : '银' }
  else if (/铜|三等/.test(normalizedAward)) { rank = 3; short = normalizedAward.includes('等') ? '三等' : '铜' }
  else return null
  const y = compName.match(/\d{4}/)
  const displayFam = OI_MERGE_FAMILY[famRaw] || fam
  return { level, rank, label: `${displayFam} ${short}`, year: y ? Number(y[0]) : 0 }
}

/**
 * 指定奖牌档选手的最高 OI 奖项分布
 * @param {string|null} regionId 赛区 id；null 表示全部赛区
 * @param {string} tier 奖牌档 gold/silver/bronze（默认 gold）
 */
export function computeOIAwardStats(dataset, regionId = null, tier = 'gold') {
  const medalKeys = new Set(
    dataset.teams
      .filter(t => t.tier === tier && (!regionId || t.regionId === regionId))
      .flatMap(t => t.members.map(m => `${m.name}@${t.school}`))
  )
  const medalPlayers = dataset.players.filter(p => medalKeys.has(p.key))

  const bestByKey = new Map()
  for (const p of medalPlayers) {
    p.oi.forEach((rec) => {
      const a = parseOIAward(rec['比赛'], rec['奖项'])
      if (!a) return
      const prev = bestByKey.get(p.key)
      const better = !prev
        || a.level > prev.level
        || (a.level === prev.level && a.rank < prev.rank)
        || (a.level === prev.level && a.rank === prev.rank && a.year > prev.year)
      if (better) bestByKey.set(p.key, a)
    })
  }

  const buckets = new Map()
  for (const a of bestByKey.values()) {
    if (!buckets.has(a.label)) buckets.set(a.label, { label: a.label, level: a.level, rank: a.rank, count: 0 })
    buckets.get(a.label).count++
  }
  const items = [...buckets.values()].sort((x, y) =>
    y.level - x.level || x.rank - y.rank || y.count - x.count || x.label.localeCompare(y.label, 'zh-Hans-CN')
  )
  return { total: medalPlayers.length, withOi: bestByKey.size, items }
}

// ---------- 赛站维度统计（赛站分析 Tab） ----------

/**
 * 赛站统计：各站获奖人数（选手口径，每站去重）+ 跨赛站获奖迁移
 * 迁移口径：在本站获得某档奖牌的选手（去重），取其在其他赛站的最好成绩，
 * 统计分布；仅统计当年还参加过其他赛站的选手
 */
export function computeRegionStats(dataset) {
  const { teams } = dataset
  const regionNames = new Map()
  for (const t of teams) if (!regionNames.has(t.regionId)) regionNames.set(t.regionId, t.regionName)

  // 每名选手在每个赛站的最好奖牌档（同一站多队时取最好）
  const playerSites = new Map() // key -> Map(regionId -> tier)
  for (const t of teams) {
    for (const m of t.members) {
      const key = `${m.name}@${t.school}`
      if (!playerSites.has(key)) playerSites.set(key, new Map())
      const sites = playerSites.get(key)
      const prev = sites.get(t.regionId)
      if (prev === undefined || TIER_RANK[t.tier] < TIER_RANK[prev]) sites.set(t.regionId, t.tier)
    }
  }

  const perSite = [...regionNames.keys()].map(regionId => {
    const counts = { gold: 0, silver: 0, bronze: 0, iron: 0 }
    let people = 0
    for (const sites of playerSites.values()) {
      const tier = sites.get(regionId)
      if (tier === undefined) continue
      people++
      counts[tier]++
    }
    return { regionId, name: regionNames.get(regionId), people, ...counts }
  })

  const migration = {}
  for (const regionId of regionNames.keys()) {
    const rows = {}
    for (const tier of MEDAL_ORDER) rows[tier] = { total: 0, other: { gold: 0, silver: 0, bronze: 0, iron: 0 } }
    for (const sites of playerSites.values()) {
      const tierAtSite = sites.get(regionId)
      if (tierAtSite === undefined) continue
      let best = null
      for (const [otherId, otherTier] of sites) {
        if (otherId === regionId) continue
        if (best === null || TIER_RANK[otherTier] < TIER_RANK[best]) best = otherTier
      }
      if (best === null) continue
      rows[tierAtSite].total++
      rows[tierAtSite].other[best]++
    }
    migration[regionId] = rows
  }

  return { perSite, migration }
}
