/**
 * 队伍奖牌字段（Gold/Silver/Bronze/Honorable/缺失）的判定与展示，统一旧代码三处实现：
 * Summary 的 medalOrder/medalLabel/medalClass（整行文字色）、RankTable/School 的行底色、Players 的计数。
 * 判定规则全部为「小写后 includes」，与旧代码一致。
 */
export type TeamMedal = 'gold' | 'silver' | 'bronze' | 'other' | 'none'

export function teamMedal(medal: string | null | undefined): TeamMedal {
  if (!medal) return 'none'
  const m = medal.toLowerCase()
  if (m.includes('gold')) return 'gold'
  if (m.includes('silver')) return 'silver'
  if (m.includes('bronze')) return 'bronze'
  return 'other'
}

/** Summary 排序键：金 0 / 银 1 / 铜 2 / 其他与缺失 3 */
export function medalOrder(medal: string | null | undefined): number {
  const t = teamMedal(medal)
  return t === 'gold' ? 0 : t === 'silver' ? 1 : t === 'bronze' ? 2 : 3
}

/** Summary 奖项列文字：缺失为 '-'，非金银铜显示原始字符串 */
export function medalLabel(medal: string | null | undefined): string {
  if (!medal) return '-'
  const t = teamMedal(medal)
  if (t === 'gold') return '🥇 金牌'
  if (t === 'silver') return '🥈 银牌'
  if (t === 'bronze') return '🥉 铜牌'
  return medal
}

/** 行色调（金/银/铜之外无色调） */
export type MedalTone = 'gold' | 'silver' | 'bronze' | null
export function medalTone(medal: string | null | undefined): MedalTone {
  const t = teamMedal(medal)
  return t === 'gold' || t === 'silver' || t === 'bronze' ? t : null
}
