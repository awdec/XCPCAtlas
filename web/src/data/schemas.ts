/**
 * 数据边界校验（Valibot，计划 M1-T4）。
 * 年份索引、赛区索引、轨迹数据完整校验；赛区文件只校验顶层与首行（生产），开发环境全量。
 * 校验失败抛出，交给页面错误态显示（防止数据管线漂移时静默渲染错误内容）。
 */
import * as v from 'valibot'
import type { Contest, ContestIndexEntry, OIRecords, Trajectories, YearEntry } from '@/domain/types'

const YearEntrySchema = v.object({ year: v.number(), contest_count: v.number(), total_teams: v.number() })
export const YearsSchema = v.array(YearEntrySchema)

const ContestIndexSchema = v.array(v.object({
  id: v.string(),
  name: v.string(),
  org: v.string(),
  city: v.optional(v.string()),
  teams: v.optional(v.number()),
  champion: v.optional(v.object({ school: v.string(), team: v.string(), solved: v.number(), penalty: v.number() })),
}))

const ProblemSchema = v.object({
  status: v.picklist(['solved', 'unsolved', 'none']),
  attempts: v.number(),
  time: v.nullable(v.number()),
})
const OIRecordSchema = v.object({ 比赛: v.string(), 奖项: v.string(), 学校: v.string(), 年级: v.string() })
const TeamRowSchema = v.object({
  rank: v.number(),
  org_rank: v.nullable(v.number()),
  school: v.string(),
  team: v.string(),
  solved: v.number(),
  penalty: v.number(),
  problems: v.record(v.string(), ProblemSchema),
  members: v.array(v.object({ name: v.string(), oi: v.array(OIRecordSchema) })),
  medal: v.optional(v.string()),
  unofficial: v.boolean(),
  girl: v.boolean(),
  icpc_id: v.nullable(v.string()),
  coaches: v.optional(v.array(v.string())),
  team_id: v.optional(v.string()),
})
const ContestTopSchema = v.object({
  id: v.string(),
  org: v.string(),
  city_cn: v.string(),
  name: v.string(),
  sheets: v.object({ 正式队伍: v.optional(v.array(v.unknown())) }),
})

const Tier = v.picklist(['gold', 'silver', 'bronze', 'iron', 'none'])
const Counts3 = v.object({ gold: v.number(), silver: v.number(), bronze: v.number() })
const TrajectoriesSchema = v.object({
  window: v.tuple([v.number(), v.number()]),
  years: v.array(v.number()),
  total: v.number(),
  first_best_tiers: v.optional(Counts3),
  all_time_best_tiers: v.optional(Counts3),
  rows: v.array(v.object({
    tiers: v.array(Tier),
    count: v.number(),
    players: v.array(v.tuple([v.string(), v.string()])),
  })),
})

const StringList = v.array(v.string())

const FULL = import.meta.env?.DEV ?? false

function check<T>(schema: v.GenericSchema, data: unknown, what: string): T {
  const r = v.safeParse(schema, data)
  if (!r.success) {
    const issue = r.issues[0]
    const path = issue?.path?.map(p => String(p.key)).join('.') ?? ''
    throw new Error(`数据格式不符（${what}${path ? ' · ' + path : ''}）：${issue?.message ?? ''}`)
  }
  return data as T
}

export const parseYears = (d: unknown) => check<YearEntry[]>(YearsSchema, d, 'years.json')
export const parseContestIndex = (d: unknown) => check<ContestIndexEntry[]>(ContestIndexSchema, d, 'contests.json')
export const parseTrajectories = (d: unknown) => check<Trajectories>(TrajectoriesSchema, d, 'trajectories.json')
export const parseStringList = (d: unknown) => check<string[]>(StringList, d, '985/211.json')
export const parseOIRecords = (d: unknown) => d as OIRecords

export function parseContest(d: unknown, full: boolean = FULL): Contest {
  const c = check<Contest>(ContestTopSchema, d, 'contest')
  const rows = c.sheets['正式队伍'] ?? []
  const toCheck = full ? rows : rows.slice(0, 1)
  for (const row of toCheck) check(TeamRowSchema, row, `contest ${c.id}`)
  return c
}
