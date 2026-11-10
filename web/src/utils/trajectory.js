// 过渡期 shim（M1-T3）：实现已迁至 src/domain/trajectory.ts。TIER_CLASS 仍为旧 Tailwind 色类，M5 随旧视图删除。M7 删除。
export { TIER_TEXT, tiersToCode, codeToTiers } from '@/domain/trajectory'
export const TIER_CLASS = {
  gold: 'text-yellow-600 font-semibold',
  silver: 'text-gray-500 font-semibold',
  bronze: 'text-amber-700 font-semibold',
  iron: 'text-gray-400',
  none: 'text-gray-300',
}
