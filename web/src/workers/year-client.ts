/**
 * 年度 Worker 客户端：懒创建 Worker；环境不支持 Worker（或创建失败）时回退主线程执行同一实现。
 */
import * as Comlink from 'comlink'
import { createYearCore, type ProgressFn, type YearCore } from '@/data/year-core'
import type { YearWorkerApi } from './year.worker'

type Client = Pick<YearCore, 'summaryRows' | 'yearDataset' | 'playerBoard' | 'schoolTeams' | 'playerRecords' | 'evictExcept'>

let client: Client | null = null

function absoluteBase(): string {
  return new URL(import.meta.env.BASE_URL, location.href).href
}

function createClient(): Client {
  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(new URL('./year.worker.ts', import.meta.url), { type: 'module', name: 'xcpc-year' })
      const remote = Comlink.wrap<YearWorkerApi>(worker)
      void remote.init(absoluteBase())
      const wrapProgress = (fn?: ProgressFn) => (fn ? Comlink.proxy(fn) : undefined)
      return {
        summaryRows: (y, p) => remote.summaryRows(y, wrapProgress(p)),
        yearDataset: (y, p) => remote.yearDataset(y, wrapProgress(p)),
        playerBoard: (y, p) => remote.playerBoard(y, wrapProgress(p)),
        schoolTeams: (y, n) => remote.schoolTeams(y, n),
        playerRecords: (ys, py, n, s) => remote.playerRecords(ys, py, n, s),
        evictExcept: (y) => { void remote.evictExcept(y) },
      }
    } catch {
      // 落到主线程实现
    }
  }
  return createYearCore()
}

export function yearClient(): Client {
  if (!client) client = createClient()
  return client
}
