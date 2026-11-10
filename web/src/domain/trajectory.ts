/**
 * 轨迹分析共享的展示常量与 URL 编解码（由 utils/trajectory.js 1:1 移植）
 * 数据形态见 scripts/gen_trajectories.py
 */
import type { Tier } from './types'

// 单字奖牌；\ 为该年未参赛
export const TIER_TEXT: Record<Tier, string> = { gold: '金', silver: '银', bronze: '铜', iron: '铁', none: '\\' }

// 轨迹行的 URL 编码：tiers -> "i-b-g-n-n"（/:year/trajectory/:code）
const TIER_CODE: Record<Tier, string> = { gold: 'g', silver: 's', bronze: 'b', iron: 'i', none: 'n' }
const TIER_FROM_CODE: Record<string, Tier> = { g: 'gold', s: 'silver', b: 'bronze', i: 'iron', n: 'none' }

export function tiersToCode(tiers: Tier[]): string {
  return tiers.map(t => TIER_CODE[t]).join('-')
}

export function codeToTiers(code: string): Tier[] | null {
  const parts = code.split('-')
  if (parts.length !== 5 || parts.some(p => !TIER_FROM_CODE[p])) return null
  return parts.map(p => TIER_FROM_CODE[p]!)
}

// 轨迹表列排序优先级（小→大）：\ < 铁 < 铜 < 银 < 金
export const TIER_SORT_ORDER: Record<Tier, number> = { none: 0, iron: 1, bronze: 2, silver: 3, gold: 4 }
export const yearSortMethod = (i: number) => (a: { tiers: Tier[] }, b: { tiers: Tier[] }): number =>
  (TIER_SORT_ORDER[a.tiers[i]!] ?? -1) - (TIER_SORT_ORDER[b.tiers[i]!] ?? -1)

export const YEAR_LABELS = ['第一年', '第二年', '第三年', '第四年', '第五年'] as const

/** 窗口 [Y-4, Y] 与实际有数据年份不一致时补充说明（TrajectoryTab） */
export function trajectoryRangeText(data: { window: [number, number]; years: number[] } | null | undefined): string {
  if (!data) return ''
  const { window: w, years } = data
  return years[0] === w[0] && years[years.length - 1] === w[1]
    ? `${w[0]}–${w[1]}`
    : `${w[0]}–${w[1]}（实际数据 ${years[0]}–${years[years.length - 1]}）`
}
