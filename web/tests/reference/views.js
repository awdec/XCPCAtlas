/**
 * 旧版视图内联逻辑的逐字拷贝（重构前基线，commit 1ea95eb）。
 * 只把 ref/computed 换成普通参数与返回值，分支、顺序、并列处理保持原样。
 * 这些函数是 golden 测试的「真值」，重构后的 domain/ 实现必须与之逐字节一致。
 * 不要修改本文件的业务逻辑。
 */

// ---------- Summary.vue（L97-L161：medalOrder / medalLabel / medalClass / 行构建） ----------

export const summaryMedalOrder = (medal) => {
  if (!medal) return 3
  const m = medal.toLowerCase()
  if (m.includes('gold')) return 0
  if (m.includes('silver')) return 1
  if (m.includes('bronze')) return 2
  return 3
}

export const summaryMedalLabel = (medal) => {
  if (!medal) return '-'
  const m = medal.toLowerCase()
  if (m.includes('gold')) return '🥇 金牌'
  if (m.includes('silver')) return '🥈 银牌'
  if (m.includes('bronze')) return '🥉 铜牌'
  return medal
}

export const summaryMedalClass = (medal) => {
  if (!medal) return ''
  const m = medal.toLowerCase()
  if (m.includes('gold')) return 'text-yellow-600 font-semibold'
  if (m.includes('silver')) return 'text-gray-500 font-semibold'
  if (m.includes('bronze')) return 'text-amber-700 font-semibold'
  return ''
}

export function summaryRows(allData) {
  const result = []
  for (const contest of allData) {
    const teams = (contest.sheets['正式队伍'] || [])
      .slice()
      .sort((a, b) => summaryMedalOrder(a.medal) - summaryMedalOrder(b.medal) || (a.rank || 9999) - (b.rank || 9999))
    for (const t of teams) {
      result.push({
        contestName: contest.name,
        rank: t.rank,
        school: t.school,
        team: t.team,
        members: t.members || [],
        medal: t.medal,
        medalOrder: summaryMedalOrder(t.medal),
      })
    }
  }
  return result
}

// Summary.vue L37：比赛下拉选项
export const summaryContestOptions = (rows) => [...new Set(rows.map(r => r.contestName))]

// Summary.vue L39-L70：筛选（f = { contest, school, team, member, schoolType, oiCount, medal }）
export function summaryFilter(rows, f, schoolTags) {
  let data = rows
  const qSchool = f.school.trim().toLowerCase()
  const qTeam = f.team.trim().toLowerCase()
  const qMember = f.member.trim().toLowerCase()
  if (f.contest) data = data.filter(r => r.contestName === f.contest)
  if (qSchool) data = data.filter(r => r.school.toLowerCase().includes(qSchool))
  if (qTeam) data = data.filter(r => r.team.toLowerCase().includes(qTeam))
  if (qMember) data = data.filter(r => r.members.some(m => m.name.toLowerCase().includes(qMember)))
  if (f.schoolType) {
    const { set985, set211 } = schoolTags
    if (f.schoolType === '985') data = data.filter(r => set985.has(r.school))
    else if (f.schoolType === '211') data = data.filter(r => set211.has(r.school) && !set985.has(r.school))
    else if (f.schoolType === 'other') data = data.filter(r => !set211.has(r.school) && !set985.has(r.school))
  }
  if (f.oiCount !== '' && f.oiCount != null) {
    const n = Number(f.oiCount)
    data = data.filter(r => r.members.filter(m => m.oi?.length).length === n)
  }
  if (f.medal) {
    data = data.filter(r => {
      if (!r.medal) return f.medal === 'other'
      const m = r.medal.toLowerCase()
      if (f.medal === 'gold') return m.includes('gold')
      if (f.medal === 'silver') return m.includes('silver')
      if (f.medal === 'bronze') return m.includes('bronze')
      if (f.medal === 'other') return !m.includes('gold') && !m.includes('silver') && !m.includes('bronze')
      return true
    })
  }
  return data
}

// ---------- Contest.vue（L43-L63：筛选） ----------
// f = { school, team, member, schoolType, oiCount }
export function contestFilter(teamsIn, f, schoolTags) {
  let teams = teamsIn
  const qSchool = f.school.trim().toLowerCase()
  const qTeam = f.team.trim().toLowerCase()
  const qMember = f.member.trim().toLowerCase()
  if (qSchool) teams = teams.filter(t => t.school.toLowerCase().includes(qSchool))
  if (qTeam) teams = teams.filter(t => t.team.toLowerCase().includes(qTeam))
  if (qMember) teams = teams.filter(t => t.members.some(m => m.name.toLowerCase().includes(qMember)))
  if (f.schoolType) {
    const { set985, set211 } = schoolTags
    if (f.schoolType === '985') teams = teams.filter(t => set985.has(t.school))
    else if (f.schoolType === '211') teams = teams.filter(t => set211.has(t.school) && !set985.has(t.school))
    else if (f.schoolType === 'other') teams = teams.filter(t => !set211.has(t.school) && !set985.has(t.school))
  }
  if (f.oiCount !== '' && f.oiCount != null) {
    const n = Number(f.oiCount)
    teams = teams.filter(t => t.members.filter(m => m.oi?.length).length === n)
  }
  return teams
}

// ---------- 分页（Contest/Summary/Players 三处相同实现） ----------
export function pageButtons(cur, total) {
  const set = new Set([cur])
  for (let step = 1; step <= 16; step *= 2) {
    if (cur - step >= 1) set.add(cur - step)
    if (cur + step <= total) set.add(cur + step)
  }
  return [...set].sort((a, b) => a - b)
}

// ---------- Players.vue（L439-L465：聚合；L381-L398：筛选） ----------
export function playerBoard(contests) {
  const map = new Map()
  for (const contest of contests) {
    const teams = contest.sheets['正式队伍'] || []
    for (const t of teams) {
      for (const m of (t.members || [])) {
        const key = `${t.school}\0${m.name}`
        if (!map.has(key)) {
          map.set(key, { school: t.school, name: m.name, gold: 0, silver: 0, bronze: 0, honorable: 0, oi: m.oi || [] })
        }
        const entry = map.get(key)
        if ((m.oi?.length || 0) > (entry.oi?.length || 0)) {
          entry.oi = m.oi
        }
        if (t.medal) {
          const medal = t.medal.toLowerCase()
          if (medal.includes('gold')) entry.gold++
          else if (medal.includes('silver')) entry.silver++
          else if (medal.includes('bronze')) entry.bronze++
          else entry.honorable++
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze)
}

// f = { school, player, schoolType, gold, silver, bronze, oi }
export function playersFilter(rows, f, schoolTags) {
  let data = rows
  const qSchool = f.school.trim().toLowerCase()
  const qPlayer = f.player.trim().toLowerCase()
  if (qSchool) data = data.filter(r => r.school.toLowerCase().includes(qSchool))
  if (qPlayer) data = data.filter(r => r.name.toLowerCase().includes(qPlayer))
  if (f.schoolType) {
    const { set985, set211 } = schoolTags
    if (f.schoolType === '985') data = data.filter(r => set985.has(r.school))
    else if (f.schoolType === '211') data = data.filter(r => set211.has(r.school) && !set985.has(r.school))
    else if (f.schoolType === 'other') data = data.filter(r => !set211.has(r.school) && !set985.has(r.school))
  }
  if (f.gold != null && f.gold !== '') data = data.filter(r => r.gold >= f.gold)
  if (f.silver != null && f.silver !== '') data = data.filter(r => r.silver >= f.silver)
  if (f.bronze != null && f.bronze !== '') data = data.filter(r => r.bronze >= f.bronze)
  if (f.oi != null && f.oi !== '') data = data.filter(r => f.oi === 'yes' ? r.oi?.length > 0 : !r.oi?.length)
  return data
}

// ---------- Player.vue（L661-L699） ----------
// contestYears: [{ year, contests }]；oi: 页面年份的 oi_records.json；school: '' 表示按姓名
export function playerRecords(contestYears, oi, name, school) {
  const results = []
  for (const { year: recordYear, contests } of contestYears) {
    for (const c of contests) {
      const teams = c.sheets['正式队伍'] || []
      for (const t of teams) {
        if (school && t.school !== school) continue
        if (!t.members.some(m => m.name === name)) continue
        results.push({
          year: recordYear,
          contest: c.name,
          contestId: c.id,
          school: t.school,
          team: t.team,
          rank: t.rank,
          solved: t.solved,
          penalty: t.penalty,
          medal: t.medal,
        })
      }
    }
  }
  const icpc = results.sort((a, b) => a.year - b.year || (a.rank || 999) - (b.rank || 999))

  const seen = new Set()
  const oiResults = []
  Object.entries(oi).forEach(([key, records]) => {
    if (key.split('@')[0] !== name) return
    if (school && key !== `${name}@${school}`) return
    records.forEach(r => {
      const dedupKey = `${r['比赛']}|${r['奖项']}`
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey)
        oiResults.push(r)
      }
    })
  })
  return { icpc, oi: oiResults }
}

// ---------- School.vue（L809-L836） ----------
export function schoolTeams(contests, schoolName) {
  const teams = []
  contests.forEach(c => {
    const formal = c.sheets['正式队伍'] || []
    formal.forEach(t => {
      if (t.school === schoolName) {
        teams.push({ ...t, _contest: c.name })
      }
    })
  })
  return teams.sort((a, b) => (a.rank || 999) - (b.rank || 999))
}

// 旧版统计（bestRank 可能为 Infinity → 旧 UI 显示 #Infinity；D3 改为 —）
export function schoolStats(allTeams) {
  const totalSolved = allTeams.reduce((s, t) => s + t.solved, 0)
  const bestRank = allTeams.length
    ? Math.min(...allTeams.map(t => t.rank || Infinity))
    : null
  return { count: allTeams.length, totalSolved, bestRank }
}

// ---------- RankTable.vue / School.vue 行底色 ----------
export const rowMedalClass = (medal) => {
  if (!medal) return ''
  const m = medal.toLowerCase()
  if (m.includes('gold')) return 'row-medal-gold'
  if (m.includes('silver')) return 'row-medal-silver'
  if (m.includes('bronze')) return 'row-medal-bronze'
  return ''
}

// ---------- Home.vue 介绍弹窗判定 ----------
export const INTRO_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
export const shouldShowIntro = (stored, now) => {
  const lastSeen = Number(stored) || 0
  return !lastSeen || now - lastSeen > INTRO_INTERVAL_MS
}
