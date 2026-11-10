/**
 * 提交记录与奖牌的展示格式化（由 utils/formatters.js 1:1 移植；未使用的 aggregateBySchool 已删除）
 */
import type { Problem } from './types'

/** 解析提交状态为显示文本：solved → +N(t) 或 (t)；unsolved → -N；none → - */
export function formatSubmission(problem: Partial<Problem> | null | undefined): string {
  if (!problem || problem.status === 'none') return '-'
  if (problem.status === 'solved') {
    const penalty = (problem.attempts as number) - 1
    return penalty > 0 ? `+${penalty}(${problem.time})` : `(${problem.time})`
  }
  if (problem.status === 'unsolved') {
    return `-${problem.attempts}`
  }
  return '-'
}

export type ProblemTone = 'problem-none' | 'problem-solved' | 'problem-unsolved'

/** 题目状态色调 */
export function problemClass(problem: Partial<Problem> | null | undefined): ProblemTone {
  if (!problem || problem.status === 'none') return 'problem-none'
  if (problem.status === 'solved') return 'problem-solved'
  return 'problem-unsolved'
}

/** 队伍详情弹窗中奖牌标签的文字色类 */
export function medalClass(medal: string | null | undefined): string {
  if (!medal) return ''
  const m = medal.toLowerCase()
  if (m.includes('gold')) return 'medal-gold'
  if (m.includes('silver')) return 'medal-silver'
  if (m.includes('bronze')) return 'medal-bronze'
  return ''
}

/** 奖牌文字：🥇 金牌 / 🥈 银牌 / 🥉 铜牌 / 原始字符串 */
export function medalText(medal: string | null | undefined): string {
  if (!medal) return ''
  const m = medal.toLowerCase()
  if (m.includes('gold')) return '🥇 金牌'
  if (m.includes('silver')) return '🥈 银牌'
  if (m.includes('bronze')) return '🥉 铜牌'
  return medal
}
