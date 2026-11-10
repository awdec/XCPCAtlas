/**
 * 数据分析统计模块（纯函数，供数据分析页使用）—— 由 utils/analysis.js 1:1 移植（计划 R5）
 *
 * 口径：
 * - XCPC 选手判重：学校+姓名 双关键字相同才算同一选手（同名跨校者视为不同人，
 *   其学校即键的一部分，无归属歧义）
 * - OIer 判定：预处理按姓名+年级反推匹配，通常大一~大五；
 *   西安交通大学、中国科学技术大学扩大为推算高一~大五，
 *   成员内嵌的 oi 数组即为该口径的产物
 * - 选手奖牌档取当年在所有赛区的最高奖牌，无奖牌记为铁牌
 * - 学校层次：985（含公告中的特殊院校）/ 211 / 双非，与学校详情页一致
 *
 * 改动前必读 docs/analysis-page.md §3。golden 测试保证与旧实现逐字节一致。
 */
import type { Contest, DatasetPlayer, DatasetTeam, MedalTier, OIRecord, SchoolTags, YearDataset } from './types'

export const MEDAL_ORDER: MedalTier[] = ['gold', 'silver', 'bronze', 'iron']
export const MEDAL_LABELS: Record<MedalTier, string> = { gold: '金牌', silver: '银牌', bronze: '铜牌', iron: '铁牌' }
export const MEDAL_COLORS: Record<MedalTier, string> = { gold: '#e6a23c', silver: '#909399', bronze: '#b3703c', iron: '#dcdfe6' }

const TIER_RANK: Record<MedalTier, number> = { gold: 0, silver: 1, bronze: 2, iron: 3 }

type TierCounts = Record<MedalTier, number>
const zeroCounts = (): TierCounts => ({ gold: 0, silver: 0, bronze: 0, iron: 0 })

export function medalTier(medal: string | null | undefined): MedalTier {
  if (!medal) return 'iron'
  const m = medal.toLowerCase()
  if (m.includes('gold')) return 'gold'
  if (m.includes('silver')) return 'silver'
  if (m.includes('bronze')) return 'bronze'
  return 'iron'
}

export type SchoolTier = '985' | '211' | '双非'

export function schoolTierOf(school: string, set985: Set<string>, set211: Set<string>): SchoolTier {
  if (set985.has(school)) return '985'
  if (set211.has(school)) return '211'
  return '双非'
}

/**
 * 构建年份统一数据集
 * @param contestsData 各赛区数据 [{ id, name, org, sheets }]
 */
export function buildYearDataset(contestsData: Contest[]): YearDataset {
  const teams: DatasetTeam[] = []
  const players: Record<string, DatasetPlayer> = {}

  for (const contest of contestsData) {
    const rows = contest.sheets?.['正式队伍'] || []
    for (const r of rows) {
      const members = r.members || []
      const tier = medalTier(r.medal)
      const team: DatasetTeam = {
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

export interface RegionMedalRow extends TierCounts { id: string; name: string }
export interface OrgMedalRow { org: string; gold: number; silver: number; bronze: number }
export interface Overview {
  contests: number
  teams: number
  appearances: number
  players: number
  medalPlayers: TierCounts
  oierPlayers: number
  oierRate: number
  perRegion: RegionMedalRow[]
  orgMedals: OrgMedalRow[]
}

/**
 * 总览统计：卡片数据 + 各赛区奖牌队伍数
 */
export function computeOverview(dataset: YearDataset): Overview {
  const { teams, players } = dataset
  const regionIds = [...new Set(teams.map(t => t.regionId))]

  const medalPlayers = zeroCounts()
  let oierPlayers = 0
  for (const p of players) {
    medalPlayers[p.bestTier]++
    if (p.isOIer) oierPlayers++
  }

  const perRegion = regionIds.map(id => {
    const rows = teams.filter(t => t.regionId === id)
    const counts = zeroCounts()
    for (const t of rows) counts[t.tier]++
    return { id, name: rows[0]?.regionName || id, ...counts }
  })

  // 分赛事（CCPC/ICPC）发放的金银铜牌总数（队伍口径）
  const byOrg: Record<string, { gold: number; silver: number; bronze: number }> = {}
  for (const t of teams) {
    if (t.tier === 'iron') continue
    if (!byOrg[t.org]) byOrg[t.org] = { gold: 0, silver: 0, bronze: 0 }
    byOrg[t.org]![t.tier]++
  }
  const orgs = ['CCPC', 'ICPC'].filter(o => byOrg[o])
    .concat(Object.keys(byOrg).filter(o => !['CCPC', 'ICPC'].includes(o)))
  const orgMedals = orgs.map(org => ({ org, ...byOrg[org]! }))

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

export interface PlayerTierStat { total: number; oier: number; rate: number }
export interface TeamTierStat { counts: [number, number, number, number]; total: number }
export interface OIerStats {
  playerTiers: Record<MedalTier, PlayerTierStat>
  teamTiers: Record<MedalTier, TeamTierStat>
}

/**
 * OIer 统计：各奖牌档选手 OIer 占比 + 各奖牌档队伍的 OIer 人数构成
 */
export function computeOIerStats(dataset: YearDataset): OIerStats {
  const { teams, players } = dataset

  const playerTiers = {} as Record<MedalTier, PlayerTierStat>
  for (const tier of MEDAL_ORDER) {
    playerTiers[tier] = { total: 0, oier: 0 } as PlayerTierStat
  }
  for (const p of players) {
    playerTiers[p.bestTier].total++
    if (p.isOIer) playerTiers[p.bestTier].oier++
  }
  for (const tier of MEDAL_ORDER) {
    const { total, oier } = playerTiers[tier]
    playerTiers[tier].rate = total ? oier / total : 0
  }

  const teamTiers = {} as Record<MedalTier, TeamTierStat>
  for (const tier of MEDAL_ORDER) {
    teamTiers[tier] = { counts: [0, 0, 0, 0], total: 0 }
  }
  for (const t of teams) {
    const tt = teamTiers[t.tier]
    tt.total++
    tt.counts[Math.min(t.oiCount, 3) as 0 | 1 | 2 | 3]++
  }

  return { playerTiers, teamTiers }
}

export interface SchoolTierStat {
  players: TierCounts
  total: number
  oier: number
  teams: number
  goldTeams: number
  goldRate: number
  medalRate: number
  oierRate: number
}
export interface SchoolStats {
  tierNames: SchoolTier[]
  tierStats: Record<SchoolTier, SchoolTierStat>
  noGold985: string[]
  goldSchools: { '211': string[]; 双非: string[] }
}

/**
 * 学校层次统计：各层次选手奖牌分布、获奖率、无金牌的 985 名单、
 * 有金牌的 211/双非 名单（层次仍按 985 > 211 > 双非 优先级归类）
 */
export function computeSchoolStats(dataset: YearDataset, tags: SchoolTags): SchoolStats {
  const { set985, set211 } = tags
  const { teams, players } = dataset

  const tierNames: SchoolTier[] = ['985', '211', '双非']
  const tierStats = {} as Record<SchoolTier, SchoolTierStat>
  for (const name of tierNames) {
    tierStats[name] = {
      players: zeroCounts(),
      total: 0,
      oier: 0,
      teams: 0,
      goldTeams: 0,
    } as SchoolTierStat
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
  const goldSchools: SchoolStats['goldSchools'] = { '211': [], 双非: [] }
  const schoolsWithGold = new Set(teams.filter(t => t.tier === 'gold').map(t => t.school))
  for (const school of schoolsWithGold) {
    const tier = schoolTierOf(school, set985, set211)
    if (tier in goldSchools) goldSchools[tier as '211' | '双非'].push(school)
  }
  for (const list of Object.values(goldSchools)) list.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))

  return { tierNames, tierStats, noGold985, goldSchools }
}

/**
 * 百分比格式化：88.9%（整百分位省略小数）
 */
export function fmtPct(fraction: number): string {
  if (!Number.isFinite(fraction)) return '-'
  const v = fraction * 100
  return (Number.isInteger(v) ? v : v.toFixed(1)) + '%'
}

// ---------- 选手维度统计（选手分析 Tab） ----------

export interface ParticipationBucket { label: string; n: number; iron: number; ironRate: number }
export interface StabilityPoint {
  name: string
  school: string
  tier: MedalTier
  n: number
  mean: number
  std: number
  range: number
}
export interface StabilityAgg { tier: MedalTier; n: number; avgRange: number; avgStd: number }
export interface PlayerStats {
  tierCounts: TierCounts
  participation: ParticipationBucket[]
  stability: StabilityPoint[]
  stabilityAgg: StabilityAgg[]
}

/**
 * 选手统计：获奖分布、参赛场次×无奖牌率、多场选手排名稳定性
 */
export function computePlayerStats(dataset: YearDataset): PlayerStats {
  const { teams, players } = dataset

  const tierCounts = zeroCounts()
  for (const p of players) tierCounts[p.bestTier]++

  // 参赛场次分桶：1 / 2 / 3 / 4 场及以上
  const buckets = [1, 2, 3].map(n => ({ label: `${n} 场`, n: 0, iron: 0 }) as ParticipationBucket)
  buckets.push({ label: '4 场及以上', n: 0, iron: 0 } as ParticipationBucket)
  for (const p of players) {
    const b = p.appearances <= 3 ? buckets[p.appearances - 1]! : buckets[3]!
    b.n++
    if (p.bestTier === 'iron') b.iron++
  }
  for (const b of buckets) b.ironRate = b.n ? b.iron / b.n : 0

  // 排名稳定性：仅统计参加 ≥2 场且有有效排名的选手
  const ranksByPlayer = new Map<string, number[]>()
  for (const t of teams) {
    if (!(t.rank > 0)) continue
    for (const m of t.members) {
      const key = `${m.name}@${t.school}`
      if (!ranksByPlayer.has(key)) ranksByPlayer.set(key, [])
      ranksByPlayer.get(key)!.push(t.rank)
    }
  }
  const stability: StabilityPoint[] = []
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
  const tierAgg = {} as Record<MedalTier, { n: number; sumRange: number; sumStd: number }>
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
const OI_FAMILY_LEVEL: Record<string, number> = {
  CSP入门: 0, NOIP普及: 0,
  CSP提高: 1, NOIP: 1, NOIP提高: 1, 春季测试: 1, NGOI: 1,
  WC: 2, APIO: 2, APIO线上: 2, CTS: 2, CTSC: 2,
  NOI: 3, NOI夏令营: 3, NOID类: 3,
  IOI: 4,
}
// 展示名归一（其余家族用原名）
const OI_FAMILY_LABEL: Record<string, string> = {
  CSP入门: '入门', NOIP普及: '入门',
  CSP提高: '提高', NOIP: '提高', NOIP提高: '提高', 春季测试: '提高', NGOI: '提高',
  CTS: 'CTSC', NOID类: 'NOI D类',
}
// 同档展示合并（用户决策 2026-09）：WC/APIO/CTSC→"WC 级"、NOI夏令营→NOI
//（国际金按 rank 0 单行展示，同样参与家族合并，如 "WC 级 国际金"）
const OI_MERGE_FAMILY: Record<string, string> = { WC: 'WC 级', APIO: 'WC 级', APIO线上: 'WC 级', CTS: 'WC 级', CTSC: 'WC 级', NOI夏令营: 'NOI' }

export interface OIAward { level: number; rank: number; label: string; year: number }

/**
 * 解析一条 OI 记录为可比等级；无法识别的比赛或奖项返回 null
 * 等级内排序：金/一等(1) < 银/二等(2) < 铜/三等(3)
 */
export function parseOIAward(compName: string, award: string): OIAward | null {
  const famRaw = compName.replace(/\d{4}/g, '')
  const level = OI_FAMILY_LEVEL[famRaw]
  if (level == null) return null
  const fam = OI_FAMILY_LABEL[famRaw] || famRaw
  // "国际"视作比赛届别名（用户决策 2026-09）：国际金牌 即 金牌
  const normalizedAward = award.replace(/国际/g, '')
  let rank: number, short: string
  if (/金|一等/.test(normalizedAward)) { rank = 1; short = normalizedAward.includes('等') ? '一等' : '金' }
  else if (/银|二等/.test(normalizedAward)) { rank = 2; short = normalizedAward.includes('等') ? '二等' : '银' }
  else if (/铜|三等/.test(normalizedAward)) { rank = 3; short = normalizedAward.includes('等') ? '三等' : '铜' }
  else return null
  const y = compName.match(/\d{4}/)
  const displayFam = OI_MERGE_FAMILY[famRaw] || fam
  return { level, rank, label: `${displayFam} ${short}`, year: y ? Number(y[0]) : 0 }
}

export interface OIAwardItem { label: string; level: number; rank: number; count: number }
export interface OIAwardStats { total: number; withOi: number; items: OIAwardItem[] }

/**
 * 指定奖牌档选手的最高 OI 奖项分布
 * @param regionId 赛区 id；null 表示全部赛区
 * @param tier 奖牌档 gold/silver/bronze（默认 gold）
 */
export function computeOIAwardStats(dataset: YearDataset, regionId: string | null = null, tier: MedalTier = 'gold'): OIAwardStats {
  const medalKeys = new Set(
    dataset.teams
      .filter(t => t.tier === tier && (!regionId || t.regionId === regionId))
      .flatMap(t => t.members.map(m => `${m.name}@${t.school}`))
  )
  const medalPlayers = dataset.players.filter(p => medalKeys.has(p.key))

  const bestByKey = new Map<string, OIAward>()
  for (const p of medalPlayers) {
    p.oi.forEach((rec: OIRecord) => {
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

  const buckets = new Map<string, OIAwardItem>()
  for (const a of bestByKey.values()) {
    if (!buckets.has(a.label)) buckets.set(a.label, { label: a.label, level: a.level, rank: a.rank, count: 0 })
    buckets.get(a.label)!.count++
  }
  const items = [...buckets.values()].sort((x, y) =>
    y.level - x.level || x.rank - y.rank || y.count - x.count || x.label.localeCompare(y.label, 'zh-Hans-CN')
  )
  return { total: medalPlayers.length, withOi: bestByKey.size, items }
}

// ---------- 赛站维度统计（赛站分析 Tab） ----------

export interface SiteRow extends TierCounts { regionId: string; name: string; people: number }
export type MigrationRow = { total: number; other: TierCounts }
export interface RegionStats {
  perSite: SiteRow[]
  migration: Record<string, Record<MedalTier, MigrationRow>>
}

/**
 * 赛站统计：各站获奖人数（选手口径，每站去重）+ 跨赛站获奖迁移
 * 迁移口径：在本站获得某档奖牌的选手（去重），取其在其他赛站的最好成绩，
 * 统计分布；仅统计当年还参加过其他赛站的选手
 */
export function computeRegionStats(dataset: YearDataset): RegionStats {
  const { teams } = dataset
  const regionNames = new Map<string, string>()
  for (const t of teams) if (!regionNames.has(t.regionId)) regionNames.set(t.regionId, t.regionName)

  // 每名选手在每个赛站的最好奖牌档（同一站多队时取最好）
  const playerSites = new Map<string, Map<string, MedalTier>>() // key -> Map(regionId -> tier)
  for (const t of teams) {
    for (const m of t.members) {
      const key = `${m.name}@${t.school}`
      if (!playerSites.has(key)) playerSites.set(key, new Map())
      const sites = playerSites.get(key)!
      const prev = sites.get(t.regionId)
      if (prev === undefined || TIER_RANK[t.tier] < TIER_RANK[prev]) sites.set(t.regionId, t.tier)
    }
  }

  const perSite = [...regionNames.keys()].map(regionId => {
    const counts = zeroCounts()
    let people = 0
    for (const sites of playerSites.values()) {
      const tier = sites.get(regionId)
      if (tier === undefined) continue
      people++
      counts[tier]++
    }
    return { regionId, name: regionNames.get(regionId)!, people, ...counts }
  })

  const migration: RegionStats['migration'] = {}
  for (const regionId of regionNames.keys()) {
    const rows = {} as Record<MedalTier, MigrationRow>
    for (const tier of MEDAL_ORDER) rows[tier] = { total: 0, other: zeroCounts() }
    for (const sites of playerSites.values()) {
      const tierAtSite = sites.get(regionId)
      if (tierAtSite === undefined) continue
      let best: MedalTier | null = null
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
