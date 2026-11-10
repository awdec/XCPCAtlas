/**
 * 路由深度与过渡类型（计划 §8.2）：
 * 更深 → forward；更浅 → back；同深度不同路由 → lateral；同路由换年份 → swap；同路由其他参数 → lateral。
 */
import type { RouteLocationNormalized } from 'vue-router'

const DEPTH: Record<string, number> = {
  Home: 0, Announcement: 0, NotFound: 0,
  YearHome: 1,
  Summary: 2, Players: 2, Analysis: 2,
  Contest: 3, School: 3, Player: 3, TrajectoryDetail: 3,
}

export type TransitionType = 'forward' | 'back' | 'lateral' | 'swap'

export const depthOf = (r: RouteLocationNormalized): number => DEPTH[String(r.name)] ?? 0

export function transitionType(to: RouteLocationNormalized, from: RouteLocationNormalized): TransitionType {
  const a = depthOf(from)
  const b = depthOf(to)
  if (b > a) return 'forward'
  if (b < a) return 'back'
  if (to.name === from.name && to.params.year !== from.params.year) return 'swap'
  return 'lateral'
}

/** 只有 query 变化（例如数据分析页的 ?tab）时不做页面级过渡 */
export const onlyQueryChanged = (to: RouteLocationNormalized, from: RouteLocationNormalized): boolean =>
  to.path === from.path
