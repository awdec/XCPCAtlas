/**
 * 榜单筛选谓词（B-F1 / B-F3 / B-F4 / B-S4 / B-P3），Contest / Summary / Players 共用唯一实现。
 * 应用顺序保持旧代码顺序（计划 B-F5）。
 */
import type { Member, SchoolTags } from './types'
import { teamMedal } from './medal'

export type SchoolType = '' | '985' | '211' | 'other'
export type MedalFilter = '' | 'gold' | 'silver' | 'bronze' | 'other'
/** 下拉清空时可能得到 '' / null / undefined，统一视为不筛选 */
export type MaybeNumber = number | '' | null | undefined

/** B-F1：trim + 小写后的子串匹配；空查询返回 null 表示不筛选 */
export function normalizeQuery(q: string): string | null {
  const v = q.trim().toLowerCase()
  return v ? v : null
}
export const includesQuery = (field: string, q: string): boolean => field.toLowerCase().includes(q)

/** B-F3：985 / 211（且非 985）/ 其他（两者皆非） */
export function matchSchoolType(school: string, type: SchoolType, tags: SchoolTags): boolean {
  const { set985, set211 } = tags
  if (type === '985') return set985.has(school)
  if (type === '211') return set211.has(school) && !set985.has(school)
  if (type === 'other') return !set211.has(school) && !set985.has(school)
  return true
}

export const isActiveNumber = (v: MaybeNumber): v is number => v !== '' && v != null

/** B-F4：OIer 人数 */
export const oierCount = (members: Member[]): number => members.filter(m => m.oi?.length).length

/** B-S4：奖项筛选；other = 缺失或非金银铜 */
export function matchMedal(medal: string | null | undefined, f: MedalFilter): boolean {
  if (!f) return true
  const t = teamMedal(medal)
  if (f === 'other') return t === 'none' || t === 'other'
  return t === f
}

// ---------------------------------------------------------------- 组合筛选

interface TeamLike { school: string; team: string; members: Member[] }

export interface TeamFilters {
  school: string
  team: string
  member: string
  schoolType: SchoolType
  oiCount: MaybeNumber
}

/** Contest 页（B-C）：学校 → 队伍 → 队员 → 学校类型 → OI 人数 */
export function filterTeams<T extends TeamLike>(rows: T[], f: TeamFilters, tags: SchoolTags): T[] {
  let data = rows
  const qSchool = normalizeQuery(f.school)
  const qTeam = normalizeQuery(f.team)
  const qMember = normalizeQuery(f.member)
  if (qSchool) data = data.filter(r => includesQuery(r.school, qSchool))
  if (qTeam) data = data.filter(r => includesQuery(r.team, qTeam))
  if (qMember) data = data.filter(r => r.members.some(m => includesQuery(m.name, qMember)))
  if (f.schoolType) data = data.filter(r => matchSchoolType(r.school, f.schoolType, tags))
  if (isActiveNumber(f.oiCount)) {
    const n = Number(f.oiCount)
    data = data.filter(r => oierCount(r.members) === n)
  }
  return data
}

export interface SummaryFilters extends TeamFilters {
  contest: string
  medal: MedalFilter
}

/** Summary 页（B-S4）：比赛 → 学校 → 队伍 → 队员 → 学校类型 → OI 人数 → 奖项 */
export function filterSummary<T extends TeamLike & { contestName: string; medal?: string | undefined }>(
  rows: T[], f: SummaryFilters, tags: SchoolTags,
): T[] {
  let data = rows
  if (f.contest) data = data.filter(r => r.contestName === f.contest)
  data = filterTeams(data, f, tags)
  if (f.medal) data = data.filter(r => matchMedal(r.medal, f.medal))
  return data
}

export type OiFilter = '' | 'yes' | 'no' | null | undefined

export interface PlayerFilters {
  school: string
  player: string
  schoolType: SchoolType
  gold: MaybeNumber
  silver: MaybeNumber
  bronze: MaybeNumber
  oi: OiFilter
}

interface BoardLike { school: string; name: string; gold: number; silver: number; bronze: number; oi: unknown[] }

/** Players 页（B-P3）：学校 → 选手 → 学校类型 → 金/银/铜 ≥ N → 有/无 OI */
export function filterPlayers<T extends BoardLike>(rows: T[], f: PlayerFilters, tags: SchoolTags): T[] {
  let data = rows
  const qSchool = normalizeQuery(f.school)
  const qPlayer = normalizeQuery(f.player)
  if (qSchool) data = data.filter(r => includesQuery(r.school, qSchool))
  if (qPlayer) data = data.filter(r => includesQuery(r.name, qPlayer))
  if (f.schoolType) data = data.filter(r => matchSchoolType(r.school, f.schoolType, tags))
  const { gold, silver, bronze, oi } = f
  if (isActiveNumber(gold)) data = data.filter(r => r.gold >= gold)
  if (isActiveNumber(silver)) data = data.filter(r => r.silver >= silver)
  if (isActiveNumber(bronze)) data = data.filter(r => r.bronze >= bronze)
  if (oi != null && oi !== '') data = data.filter(r => (oi === 'yes' ? r.oi?.length > 0 : !r.oi?.length))
  return data
}
