/**
 * Vue Query 键（计划 M1-T4）。缓存身份与旧 dataLoader 一一对应。
 */
export const qk = {
  years: () => ['years'] as const,
  schoolTags: () => ['schoolTags'] as const,
  contests: (year: string) => ['contests', year] as const,
  contest: (year: string, id: string) => ['contest', year, id] as const,
  oi: (year: string) => ['oi', year] as const,
  trajectories: (year: string) => ['trajectories', year] as const,
  /** 年度聚合集（Worker 计算）：kind 区分 summary / board / dataset / school / player */
  yearSet: (kind: string, year: string, ...args: (string | number | boolean)[]) => ['year-set', kind, year, ...args] as const,
}
