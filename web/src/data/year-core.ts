/**
 * 年度数据的加载与聚合核心（无 DOM 依赖）。Worker 与主线程回退共用同一实现。
 * - 进程内缓存已解析的赛区文件（键同旧 dataLoader：year_id），避免重复下载/解析
 * - 顺序加载（Summary / Analysis：逐个文件、按索引顺序、上报进度；D1：无人为等待）
 *   并行加载（Players / School / Player）
 */
import type { Contest, OIRecords, SchoolTags, YearDataset } from '@/domain/types'
import { buildYearDataset } from '@/domain/analysis'
import {
  playerBoard, playerRecords, schoolTeams, summaryRows,
  type PlayerBoardRow, type PlayerRecords, type SchoolTeamRow, type SummaryRow,
} from '@/domain/aggregate'
import { loadContest, loadContestsIndex, loadOIRecords, type LoadOpts } from './loaders'

export type ProgressFn = (done: number, total: number) => void

export interface YearCoreOptions {
  /** 数据根路径（Worker 中无 import.meta.env.BASE_URL 时由主线程传入） */
  base?: string
}

export function createYearCore(opts: YearCoreOptions = {}) {
  const contestCache = new Map<string, Promise<Contest>>()
  const oiCache = new Map<string, Promise<OIRecords>>()
  const o: LoadOpts = opts.base ? { base: opts.base } : {}

  const contest = (year: string | number, id: string): Promise<Contest> => {
    const key = `${year}_${id}`
    let p = contestCache.get(key)
    if (!p) {
      p = loadContest(year, id, o)
      contestCache.set(key, p)
      p.catch(() => contestCache.delete(key))
    }
    return p
  }

  async function loadYear(year: string | number, sequential: boolean, onProgress?: ProgressFn): Promise<Contest[]> {
    const index = await loadContestsIndex(year, o)
    const total = index.length
    onProgress?.(0, total)
    if (sequential) {
      const all: Contest[] = []
      for (const c of index) {
        all.push(await contest(year, c.id))
        onProgress?.(all.length, total)
      }
      return all
    }
    let done = 0
    return Promise.all(index.map(c => contest(year, c.id).then(d => { onProgress?.(++done, total); return d })))
  }

  const oi = (year: string | number): Promise<OIRecords> => {
    const key = String(year)
    let p = oiCache.get(key)
    if (!p) {
      p = loadOIRecords(year, o)
      oiCache.set(key, p)
      p.catch(() => oiCache.delete(key))
    }
    return p
  }

  return {
    async summaryRows(year: string, onProgress?: ProgressFn): Promise<SummaryRow[]> {
      return summaryRows(await loadYear(year, true, onProgress))
    },
    async yearDataset(year: string, onProgress?: ProgressFn): Promise<YearDataset> {
      return buildYearDataset(await loadYear(year, true, onProgress))
    },
    async playerBoard(year: string, onProgress?: ProgressFn): Promise<PlayerBoardRow[]> {
      return playerBoard(await loadYear(year, false, onProgress))
    },
    async schoolTeams(year: string, name: string): Promise<SchoolTeamRow[]> {
      return schoolTeams(await loadYear(year, false), name)
    },
    /** years：参与检索的年份（scope=all 为全部年份）；OI 始终读页面年份 */
    async playerRecords(years: (string | number)[], pageYear: string, name: string, school: string): Promise<PlayerRecords> {
      const [contestYears, oiData] = await Promise.all([
        Promise.all(years.map(async y => ({ year: Number(y), contests: await loadYear(y, false) }))),
        oi(pageYear),
      ])
      return playerRecords(contestYears, oiData, name, school)
    },
    /** 释放非当前年份的缓存（scope=all 页面离开后降低内存） */
    evictExcept(keepYear: string): void {
      for (const k of contestCache.keys()) if (!k.startsWith(`${keepYear}_`)) contestCache.delete(k)
      for (const k of oiCache.keys()) if (k !== keepYear) oiCache.delete(k)
    },
  }
}

export type YearCore = ReturnType<typeof createYearCore>

/** 学校标签在 Worker 中不需要；类型导出供主线程复用 */
export type { SchoolTags }
