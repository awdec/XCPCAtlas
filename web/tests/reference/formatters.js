// 冻结拷贝：重构前 web/src/utils 的原文件（commit 1ea95eb），golden 基线来源，勿改。
/**
 * 提交记录格式化与工具函数
 */

/**
 * 解析提交状态为显示文本
 */
export function formatSubmission(problem) {
  if (!problem || problem.status === 'none') return '-'
  if (problem.status === 'solved') {
    const penalty = problem.attempts - 1
    return penalty > 0 ? `+${penalty}(${problem.time})` : `(${problem.time})`
  }
  if (problem.status === 'unsolved') {
    return `-${problem.attempts}`
  }
  return '-'
}

/**
 * 获取题目状态 CSS 类
 */
export function problemClass(problem) {
  if (!problem || problem.status === 'none') return 'problem-none'
  if (problem.status === 'solved') return 'problem-solved'
  return 'problem-unsolved'
}

/**
 * 奖牌显示
 */
export function medalClass(medal) {
  if (!medal) return ''
  const m = medal.toLowerCase()
  if (m.includes('gold')) return 'medal-gold'
  if (m.includes('silver')) return 'medal-silver'
  if (m.includes('bronze')) return 'medal-bronze'
  return ''
}

export function medalText(medal) {
  if (!medal) return ''
  const m = medal.toLowerCase()
  if (m.includes('gold')) return '🥇 金牌'
  if (m.includes('silver')) return '🥈 银牌'
  if (m.includes('bronze')) return '🥉 铜牌'
  return medal
}

/**
 * 按学校聚合统计
 */
export function aggregateBySchool(teams) {
  const map = {}
  teams.forEach(t => {
    if (!t.school) return
    if (!map[t.school]) {
      map[t.school] = { school: t.school, teams: 0, totalSolved: 0, bestRank: Infinity, bestTeam: '' }
    }
    const s = map[t.school]
    s.teams++
    s.totalSolved += t.solved
    if (t.rank && t.rank < s.bestRank) {
      s.bestRank = t.rank
      s.bestTeam = t.team
    }
  })
  return Object.values(map).sort((a, b) => b.totalSolved - a.totalSolved)
}
