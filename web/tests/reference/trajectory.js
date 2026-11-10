// 冻结拷贝：重构前 web/src/utils 的原文件（commit 1ea95eb），golden 基线来源，勿改。
/**
 * 轨迹分析共享的展示常量与 URL 编解码
 * （TrajectoryTab / TrajectoryDetail 共用；数据形态见 scripts/gen_trajectories.py）
 */

// 单字奖牌与配色，色系沿用 Players.vue 的 Tailwind 用色；\ 为该年未参赛
export const TIER_TEXT = { gold: '金', silver: '银', bronze: '铜', iron: '铁', none: '\\' }
export const TIER_CLASS = {
  gold: 'text-yellow-600 font-semibold',
  silver: 'text-gray-500 font-semibold',
  bronze: 'text-amber-700 font-semibold',
  iron: 'text-gray-400',
  none: 'text-gray-300',
}

// 轨迹行的 URL 编码：tiers -> "i-b-g-n-n"（/:year/trajectory/:code）
const TIER_CODE = { gold: 'g', silver: 's', bronze: 'b', iron: 'i', none: 'n' }
const TIER_FROM_CODE = { g: 'gold', s: 'silver', b: 'bronze', i: 'iron', n: 'none' }

export function tiersToCode(tiers) {
  return tiers.map(t => TIER_CODE[t]).join('-')
}

export function codeToTiers(code) {
  const parts = code.split('-')
  if (parts.length !== 5 || parts.some(p => !TIER_FROM_CODE[p])) return null
  return parts.map(p => TIER_FROM_CODE[p])
}
