/**
 * 数据模型类型（计划 §3.2）。字段事实由 2026-11 全量数据核对：
 * rank 恒为 number；org_rank 可为 null；medal 为 Gold/Silver/Bronze/Honorable 或缺失；
 * members[].oi 恒存在（可为空数组）；coaches/team_id 可选。
 */

export type ProblemStatus = 'solved' | 'unsolved' | 'none'

export interface Problem {
  status: ProblemStatus
  attempts: number
  time: number | null
}

/** OI 获奖记录，键为中文（来源 OIerDb） */
export interface OIRecord {
  比赛: string
  奖项: string
  学校: string
  年级: string
}

export interface Member {
  name: string
  oi: OIRecord[]
}

export interface TeamRow {
  rank: number
  org_rank: number | null
  school: string
  team: string
  solved: number
  penalty: number
  problems: Record<string, Problem>
  members: Member[]
  medal?: string
  unofficial: boolean
  girl: boolean
  icpc_id: string | null
  coaches?: string[]
  team_id?: string
}

export interface Contest {
  id: string
  org: string
  city_cn: string
  name: string
  sheets: { 正式队伍?: TeamRow[] }
}

export interface ContestChampion {
  school: string
  team: string
  solved: number
  penalty: number
}

export interface ContestIndexEntry {
  id: string
  name: string
  org: string
  city: string
  teams: number
  champion?: ContestChampion
}

export interface YearEntry {
  year: number
  contest_count: number
  total_teams: number
}

export type OIRecords = Record<string, OIRecord[]>

/** 奖牌档（含铁=无奖牌） */
export type MedalTier = 'gold' | 'silver' | 'bronze' | 'iron'
/** 轨迹档：多一个 none = 该年未参赛 */
export type Tier = MedalTier | 'none'

export interface TierCounts3 {
  gold: number
  silver: number
  bronze: number
}

export interface TrajectoryRow {
  tiers: Tier[]
  count: number
  /** [学校, 姓名] */
  players: [string, string][]
}

export interface Trajectories {
  window: [number, number]
  years: number[]
  total: number
  first_best_tiers?: TierCounts3
  all_time_best_tiers?: TierCounts3
  rows: TrajectoryRow[]
}

export interface SchoolTags {
  set985: Set<string>
  set211: Set<string>
}

// ---------- 分析数据集（analysis.ts） ----------

export interface DatasetTeam {
  regionId: string
  regionName: string
  org: string
  rank: number
  school: string
  team: string
  medal: string | undefined
  tier: MedalTier
  members: Member[]
  oiCount: number
}

export interface DatasetPlayer {
  key: string
  name: string
  school: string
  appearances: number
  bestTier: MedalTier
  isOIer: boolean
  oi: OIRecord[]
}

export interface YearDataset {
  teams: DatasetTeam[]
  players: DatasetPlayer[]
}
