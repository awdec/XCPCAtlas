// 被测实现：golden.test 用它重算并与冻结基线比较（M1-T3 起指向 src/ 下的新实现）。
// 适配层只做函数改名与参数形态转换，不含业务逻辑。
import * as analysis from '../../src/domain/analysis.ts'
import * as trajectory from '../../src/domain/trajectory.ts'
import * as formatters from '../../src/domain/formatters.ts'
import * as medal from '../../src/domain/medal.ts'
import * as filters from '../../src/domain/filters.ts'
import * as pagination from '../../src/domain/pagination.ts'
import * as agg from '../../src/domain/aggregate/index.ts'
import * as opts from '../../src/features/analysis/charts/options.ts'
import { INTRO_INTERVAL_MS, shouldShowIntro } from '../../src/features/intro-dialog/intro.ts'

const teamF = (f) => ({ school: f.school, team: f.team, member: f.member, schoolType: f.schoolType, oiCount: f.oiCount })

// 旧版 schoolStats 无排名时为 Infinity；新版按 D3 返回 null。适配回旧形态以复用基线，
// D3 的新行为由 tests/unit/domain.test.ts 单独断言。
const legacySchoolStats = (teams) => {
  const s = agg.schoolStats(teams)
  return { ...s, bestRank: teams.length ? (s.bestRank ?? Infinity) : null }
}
// 旧版 schoolTeams 只附加 _contest；新版额外附加 _contestId，比较前去掉
const legacySchoolTeams = (contests, name) => agg.schoolTeams(contests, name).map(({ _contestId, ...t }) => t)

const views = {
  summaryRows: agg.summaryRows,
  summaryContestOptions: agg.summaryContestOptions,
  summaryFilter: (rows, f, tags) => filters.filterSummary(rows, { ...teamF(f), contest: f.contest, medal: f.medal }, tags),
  summaryMedalOrder: medal.medalOrder,
  summaryMedalLabel: medal.medalLabel,
  summaryMedalClass: (m) => ({ gold: 'text-yellow-600 font-semibold', silver: 'text-gray-500 font-semibold', bronze: 'text-amber-700 font-semibold' })[medal.medalTone(m)] ?? '',
  rowMedalClass: (m) => (medal.medalTone(m) ? `row-medal-${medal.medalTone(m)}` : ''),
  contestFilter: (teams, f, tags) => filters.filterTeams(teams, teamF(f), tags),
  pageButtons: pagination.pageButtons,
  playerBoard: agg.playerBoard,
  playersFilter: (rows, f, tags) => filters.filterPlayers(rows, { school: f.school, player: f.player, schoolType: f.schoolType, gold: f.gold, silver: f.silver, bronze: f.bronze, oi: f.oi }, tags),
  playerRecords: agg.playerRecords,
  schoolTeams: legacySchoolTeams,
  schoolStats: legacySchoolStats,
  INTRO_INTERVAL_MS,
  shouldShowIntro,
}

const charts = { ...opts, trajectoryYearSortMethod: trajectory.yearSortMethod, trajectoryRangeText: trajectory.trajectoryRangeText }

export default { analysis, trajectory, formatters, views, charts }
