/**
 * 动效令牌的 TS 镜像（计划 §8.1），供 motion-v 使用。CSS 侧见 shared/styles/tokens.css。
 */
export const dur = { instant: 0.08, fast: 0.15, base: 0.22, slow: 0.32 } as const
export const ease = {
  standard: [0.2, 0, 0, 1] as const,
  enter: [0.05, 0.7, 0.1, 1] as const,
  exit: [0.3, 0, 0.8, 0.15] as const,
}
export const spring = {
  snappy: { type: 'spring', stiffness: 420, damping: 34 } as const,
  gentle: { type: 'spring', stiffness: 220, damping: 26 } as const,
}
/** 列表交错：每项 30ms，最多前 8 项 */
export const staggerDelay = (i: number): number => Math.min(i, 8) * 0.03
