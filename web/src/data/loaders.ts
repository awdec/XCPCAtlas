/**
 * 数据加载函数（无框架依赖）：主线程的 Vue Query 与年度 Worker 共用。
 * 与旧 dataLoader.js 的 URL 完全一致；缓存交给调用方（Query / Worker 内存）。
 */
import type { Contest, ContestIndexEntry, OIRecords, SchoolTags, Trajectories, YearEntry } from '@/domain/types'
import { fetchJson } from './fetch-json'
import { parseContest, parseContestIndex, parseOIRecords, parseStringList, parseTrajectories, parseYears } from './schemas'

export interface LoadOpts { signal?: AbortSignal | undefined; base?: string }

export const loadYears = async (o?: LoadOpts): Promise<YearEntry[]> =>
  parseYears(await fetchJson('years.json', o))

export const loadContestsIndex = async (year: string | number, o?: LoadOpts): Promise<ContestIndexEntry[]> =>
  parseContestIndex(await fetchJson(`${year}/contests.json`, o))

export const loadContest = async (year: string | number, id: string, o?: LoadOpts): Promise<Contest> =>
  parseContest(await fetchJson(`${year}/${id}.json`, o))

export const loadOIRecords = async (year: string | number, o?: LoadOpts): Promise<OIRecords> =>
  parseOIRecords(await fetchJson(`${year}/oi_records.json`, o))

export const loadTrajectories = async (year: string | number, o?: LoadOpts): Promise<Trajectories> =>
  parseTrajectories(await fetchJson(`${year}/trajectories.json`, o))

export async function loadSchoolTags(o?: LoadOpts): Promise<SchoolTags> {
  const [d985, d211] = await Promise.all([
    fetchJson<unknown>('985.json', o).then(parseStringList),
    fetchJson<unknown>('211.json', o).then(parseStringList),
  ])
  return { set985: new Set(d985), set211: new Set(d211) }
}
