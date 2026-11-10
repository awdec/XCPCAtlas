/**
 * Vue Query 组合式函数（计划 §5.3）。页面只通过这里取数据。
 * - 单文件：staleTime ∞，gcTime 10 分钟（静态数据，永不过期）
 * - 年度聚合集：由 Worker 计算；带进度；非当前年份 gcTime 60 秒（scope=all 内存回收）
 */
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { keepPreviousData, useQuery, useQueryClient, type QueryClient } from '@tanstack/vue-query'
import { qk } from './query-keys'
import * as L from './loaders'
import { yearClient } from '@/workers/year-client'

const TEN_MIN = 10 * 60 * 1000

export function useYears() {
  return useQuery({ queryKey: qk.years(), queryFn: ({ signal }) => L.loadYears({ signal }), staleTime: Infinity, gcTime: TEN_MIN })
}

export function useSchoolTags() {
  return useQuery({ queryKey: qk.schoolTags(), queryFn: ({ signal }) => L.loadSchoolTags({ signal }), staleTime: Infinity, gcTime: Infinity })
}

export function useContestsIndex(year: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => qk.contests(toValue(year))),
    queryFn: ({ signal }) => L.loadContestsIndex(toValue(year), { signal }),
    staleTime: Infinity,
    gcTime: TEN_MIN,
  })
}

export function useContest(year: MaybeRefOrGetter<string>, id: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: computed(() => qk.contest(toValue(year), toValue(id))),
    queryFn: ({ signal }) => L.loadContest(toValue(year), toValue(id), { signal }),
    enabled: computed(() => toValue(enabled)),
    staleTime: Infinity,
    gcTime: TEN_MIN,
  })
}

export function prefetchContest(client: QueryClient, year: string, id: string) {
  return client.prefetchQuery({ queryKey: qk.contest(year, id), queryFn: () => L.loadContest(year, id), staleTime: Infinity })
}

export function useTrajectories(year: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => qk.trajectories(toValue(year))),
    queryFn: ({ signal }) => L.loadTrajectories(toValue(year), { signal }),
    staleTime: Infinity,
    gcTime: TEN_MIN,
    retry: 0,
  })
}

/** 年度聚合进度（x / n）；n=0 表示索引尚未返回 */
export interface LoadProgressState { done: number; total: number }

function useYearSet<T>(
  kind: string,
  key: () => (string | number | boolean)[],
  year: () => string,
  run: (onProgress: (done: number, total: number) => void) => Promise<T>,
  opts: { gcTime?: number } = {},
) {
  const progress = ref<LoadProgressState>({ done: 0, total: 0 })
  const query = useQuery({
    queryKey: computed(() => qk.yearSet(kind, year(), ...key())),
    queryFn: () => {
      progress.value = { done: 0, total: 0 }
      return run((done, total) => { progress.value = { done, total } })
    },
    staleTime: Infinity,
    gcTime: opts.gcTime ?? TEN_MIN,
    retry: 0,
  })
  return { ...query, progress }
}

/** Summary：顺序加载（D1 无等待）+ 行构建 */
export function useSummaryRows(year: MaybeRefOrGetter<string>) {
  return useYearSet('summary', () => [], () => toValue(year), (p) => yearClient().summaryRows(toValue(year), p))
}

/** Analysis：顺序加载 + buildYearDataset */
export function useYearDataset(year: MaybeRefOrGetter<string>) {
  return useYearSet('dataset', () => [], () => toValue(year), (p) => yearClient().yearDataset(toValue(year), p))
}

/** Players：并行加载 + 学校+姓名聚合 */
export function usePlayerBoard(year: MaybeRefOrGetter<string>) {
  return useYearSet('board', () => [], () => toValue(year), (p) => yearClient().playerBoard(toValue(year), p))
}

export function useSchoolTeams(year: MaybeRefOrGetter<string>, name: MaybeRefOrGetter<string>) {
  return useYearSet('school', () => [toValue(name)], () => toValue(year), () => yearClient().schoolTeams(toValue(year), toValue(name)))
}

/**
 * Player：allYears 时检索 years.json 中全部年份（school 非空则按学校+姓名），否则只检索页面年份。
 * scope=all 结果 gcTime 60 秒（计划 M4-T5）。
 */
export function usePlayerRecords(
  year: MaybeRefOrGetter<string>,
  name: MaybeRefOrGetter<string>,
  allYears: MaybeRefOrGetter<boolean>,
  school: MaybeRefOrGetter<string>,
) {
  const client = useQueryClient()
  return useYearSet(
    'player',
    () => [toValue(name), toValue(allYears), toValue(school)],
    () => toValue(year),
    async () => {
      // 先固定本次请求的全部参数：await 期间路由可能已切换，
      // 之后再读 toValue 会把新参数算进旧 queryKey 的缓存（B-PL3）
      const pageYear = toValue(year)
      const playerName = toValue(name)
      const playerSchool = toValue(school)
      const scopeAll = toValue(allYears)
      const years = scopeAll
        ? (await client.fetchQuery({ queryKey: qk.years(), queryFn: () => L.loadYears(), staleTime: Infinity })).map(y => y.year)
        : [pageYear]
      return yearClient().playerRecords(years, pageYear, playerName, playerSchool)
    },
    { gcTime: toValue(allYears) ? 60_000 : TEN_MIN },
  )
}

export { keepPreviousData }
