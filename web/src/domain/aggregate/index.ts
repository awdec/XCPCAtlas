/**
 * 各页面的年度聚合（由旧视图内联逻辑 1:1 移植，基线见 tests/reference/views.js）。
 * 纯函数，可在主线程或 Worker 中运行。
 */
import type { Contest, Member, OIRecord, OIRecords, TeamRow } from '../types'
import { medalOrder } from '../medal'

// ---------------------------------------------------------------- Summary（B-S3）

export interface SummaryRow {
  contestName: string
  rank: number
  school: string
  team: string
  members: Member[]
  medal: string | undefined
  medalOrder: number
}

/** 每个赛区按 金→银→铜→其他、再按排名（缺失 9999）稳定排序；赛区之间保持索引顺序 */
export function summaryRows(allData: Contest[]): SummaryRow[] {
  const result: SummaryRow[] = []
  for (const contest of allData) {
    const teams = (contest.sheets['正式队伍'] || [])
      .slice()
      .sort((a, b) => medalOrder(a.medal) - medalOrder(b.medal) || (a.rank || 9999) - (b.rank || 9999))
    for (const t of teams) {
      result.push({
        contestName: contest.name,
        rank: t.rank,
        school: t.school,
        team: t.team,
        members: t.members || [],
        medal: t.medal,
        medalOrder: medalOrder(t.medal),
      })
    }
  }
  return result
}

/** B-S4：比赛下拉选项（首次出现顺序） */
export const summaryContestOptions = (rows: SummaryRow[]): string[] => [...new Set(rows.map(r => r.contestName))]

// ---------------------------------------------------------------- Players（B-P2）

export interface PlayerBoardRow {
  school: string
  name: string
  gold: number
  silver: number
  bronze: number
  honorable: number
  oi: OIRecord[]
}

/** 按 学校+姓名 聚合；队伍奖牌逐队计数；oi 取最长；金→银→铜 降序（稳定） */
export function playerBoard(contests: Contest[]): PlayerBoardRow[] {
  const map = new Map<string, PlayerBoardRow>()
  for (const contest of contests) {
    const teams = contest.sheets['正式队伍'] || []
    for (const t of teams) {
      for (const m of (t.members || [])) {
        const key = `${t.school}\0${m.name}`
        if (!map.has(key)) {
          map.set(key, { school: t.school, name: m.name, gold: 0, silver: 0, bronze: 0, honorable: 0, oi: m.oi || [] })
        }
        const entry = map.get(key)!
        if ((m.oi?.length || 0) > (entry.oi?.length || 0)) {
          entry.oi = m.oi
        }
        if (t.medal) {
          const medal = t.medal.toLowerCase()
          if (medal.includes('gold')) entry.gold++
          else if (medal.includes('silver')) entry.silver++
          else if (medal.includes('bronze')) entry.bronze++
          else entry.honorable++
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze)
}

// ---------------------------------------------------------------- Player（B-PL4 / B-PL5）

export interface PlayerContestRecord {
  year: number
  contest: string
  contestId: string
  school: string
  team: string
  rank: number
  solved: number
  penalty: number
  medal: string | undefined
}

export interface PlayerRecords {
  icpc: PlayerContestRecord[]
  oi: OIRecord[]
}

/**
 * school 为空：按姓名匹配（年度页）；school 非空：学校+姓名（scope=all）。
 * OI 记录来自页面年份的 oi_records.json，按 比赛|奖项 去重。
 */
export function playerRecords(
  contestYears: { year: number; contests: Contest[] }[],
  oi: OIRecords,
  name: string,
  school: string,
): PlayerRecords {
  const results: PlayerContestRecord[] = []
  for (const { year: recordYear, contests } of contestYears) {
    for (const c of contests) {
      const teams = c.sheets['正式队伍'] || []
      for (const t of teams) {
        if (school && t.school !== school) continue
        if (!t.members.some(m => m.name === name)) continue
        results.push({
          year: recordYear,
          contest: c.name,
          contestId: c.id,
          school: t.school,
          team: t.team,
          rank: t.rank,
          solved: t.solved,
          penalty: t.penalty,
          medal: t.medal,
        })
      }
    }
  }
  const icpc = results.sort((a, b) => a.year - b.year || (a.rank || 999) - (b.rank || 999))

  const seen = new Set<string>()
  const oiResults: OIRecord[] = []
  Object.entries(oi).forEach(([key, records]) => {
    if (key.split('@')[0] !== name) return
    if (school && key !== `${name}@${school}`) return
    records.forEach(r => {
      const dedupKey = `${r['比赛']}|${r['奖项']}`
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey)
        oiResults.push(r)
      }
    })
  })
  return { icpc, oi: oiResults }
}

// ---------------------------------------------------------------- School（B-SC2 / B-SC3）

export type SchoolTeamRow = TeamRow & { _contest: string; _contestId: string }

/** 该校全部正式队伍，按排名（缺失 999）升序 */
export function schoolTeams(contests: Contest[], schoolName: string): SchoolTeamRow[] {
  const teams: SchoolTeamRow[] = []
  contests.forEach(c => {
    const formal = c.sheets['正式队伍'] || []
    formal.forEach(t => {
      if (t.school === schoolName) {
        teams.push({ ...t, _contest: c.name, _contestId: c.id })
      }
    })
  })
  return teams.sort((a, b) => (a.rank || 999) - (b.rank || 999))
}

export interface SchoolPageStats {
  count: number
  totalSolved: number
  /** null：无有效排名（D3：显示 —） */
  bestRank: number | null
}

/** D3：无队伍或全部队伍缺排名时 bestRank 为 null（旧实现为 Infinity → "#Infinity"） */
export function schoolStats(allTeams: TeamRow[]): SchoolPageStats {
  const totalSolved = allTeams.reduce((s, t) => s + t.solved, 0)
  const min = allTeams.length ? Math.min(...allTeams.map(t => t.rank || Infinity)) : Infinity
  return { count: allTeams.length, totalSolved, bestRank: Number.isFinite(min) ? min : null }
}
