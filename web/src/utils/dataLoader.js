/**
 * 数据加载与缓存模块（支持多年份）
 */

const cache = {}

/**
 * fetch + JSON 解析，非 2xx 时抛出带上下文的错误
 */
async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`加载失败 (${res.status}): ${url}`)
  return res.json()
}

/**
 * 加载可用年份列表
 */
export async function loadYears() {
  if (cache._years) return cache._years
  cache._years = await fetchJSON('./data/years.json')
  return cache._years
}

/**
 * 加载指定年份的赛区索引
 */
export async function loadContestsIndex(year) {
  const key = `_index_${year}`
  if (cache[key]) return cache[key]
  cache[key] = await fetchJSON(`./data/${year}/contests.json`)
  return cache[key]
}

/**
 * 加载单个赛区数据
 */
export async function loadContestData(year, contestId) {
  const key = `${year}_${contestId}`
  if (cache[key]) return cache[key]
  cache[key] = await fetchJSON(`./data/${year}/${contestId}.json`)
  return cache[key]
}

/**
 * 加载所有赛区数据（用于跨赛区搜索/对比）
 */
export async function loadAllContests(year) {
  const index = await loadContestsIndex(year)
  const all = await Promise.all(index.map(c => loadContestData(year, c.id)))
  return all
}

/**
 * 加载 OI 奖项记录
 */
export async function loadOIRecords(year) {
  const key = `_oi_${year}`
  if (cache[key]) return cache[key]
  cache[key] = await fetchJSON(`./data/${year}/oi_records.json`)
  return cache[key]
}

/**
 * 加载预计算的选手五年奖牌轨迹（scripts/gen_trajectories.py 生成）
 */
export async function loadTrajectories(year) {
  const key = `_traj_${year}`
  if (cache[key]) return cache[key]
  cache[key] = await fetchJSON(`./data/${year}/trajectories.json`)
  return cache[key]
}

/**
 * 加载 985/211 学校名单（全局共享）
 */
export async function loadSchoolTags() {
  if (cache._tags) return cache._tags
  const [d985, d211] = await Promise.all([
    fetchJSON('./data/985.json'),
    fetchJSON('./data/211.json'),
  ])
  cache._tags = { set985: new Set(d985), set211: new Set(d211) }
  return cache._tags
}
