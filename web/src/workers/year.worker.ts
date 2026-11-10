/**
 * 年度数据 Worker（计划 M4-T1）：在后台线程下载、解析、聚合整年数据，主线程只接收结果。
 * 通过 Comlink 暴露 year-core 的方法；进度回调以 Comlink.proxy 传入。
 */
import * as Comlink from 'comlink'
import { createYearCore, type YearCore } from '@/data/year-core'

let core: YearCore | null = null

const api = {
  init(base: string) {
    core = createYearCore({ base })
  },
  summaryRows: (...a: Parameters<YearCore['summaryRows']>) => core!.summaryRows(...a),
  yearDataset: (...a: Parameters<YearCore['yearDataset']>) => core!.yearDataset(...a),
  playerBoard: (...a: Parameters<YearCore['playerBoard']>) => core!.playerBoard(...a),
  schoolTeams: (...a: Parameters<YearCore['schoolTeams']>) => core!.schoolTeams(...a),
  playerRecords: (...a: Parameters<YearCore['playerRecords']>) => core!.playerRecords(...a),
  evictExcept: (...a: Parameters<YearCore['evictExcept']>) => core!.evictExcept(...a),
}

export type YearWorkerApi = typeof api

Comlink.expose(api)
