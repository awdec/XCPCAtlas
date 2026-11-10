// 数据层（M1-T4）：错误文案、HTML 回退识别、请求去重、Schema 校验
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchJson, DataNotFoundError, dataUrl } from '@/data/fetch-json'
import { parseContest, parseYears, parseTrajectories } from '@/data/schemas'
import { createYearCore } from '@/data/year-core'

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })

describe('fetchJson', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('拼接 base 与 data/ 路径', () => {
    expect(dataUrl('years.json', '/XCPCAtlas/')).toBe('/XCPCAtlas/data/years.json')
    expect(dataUrl('2025/a.json', 'http://x/XCPCAtlas')).toBe('http://x/XCPCAtlas/data/2025/a.json')
  })

  it('非 2xx 抛出「加载失败 (status): url」', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })))
    await expect(fetchJson('years.json', { base: '/b/' })).rejects.toThrow('加载失败 (500): /b/data/years.json')
  })

  it('dev server 返回 HTML 时视为不存在', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } })))
    await expect(fetchJson('2025/nope.json', { base: '/' })).rejects.toBeInstanceOf(DataNotFoundError)
  })
})

describe('schemas', () => {
  it('years.json 校验', () => {
    expect(parseYears([{ year: 2025, contest_count: 1, total_teams: 2 }])).toHaveLength(1)
    expect(() => parseYears([{ year: '2025' }])).toThrow(/数据格式不符/)
  })
  it('赛区文件：生产只校验首行', () => {
    const row = { rank: 1, org_rank: null, school: 's', team: 't', solved: 0, penalty: 0, problems: {}, members: [], unofficial: false, girl: false, icpc_id: null }
    const ok = { id: 'a', org: 'ICPC', city_cn: 'x', name: 'n', sheets: { 正式队伍: [row, { bad: true }] } }
    expect(() => parseContest(ok, false)).not.toThrow()
    expect(() => parseContest(ok, true)).toThrow()
  })
  it('轨迹数据 tier 取值', () => {
    const base = { window: [2021, 2025], years: [2021], total: 1, rows: [{ tiers: ['gold'], count: 1, players: [['s', 'n']] }] }
    expect(parseTrajectories(base).total).toBe(1)
    expect(() => parseTrajectories({ ...base, rows: [{ tiers: ['x'], count: 1, players: [] }] })).toThrow()
  })
})

describe('year-core', () => {
  it('同一赛区文件只请求一次；顺序加载上报 x/n', async () => {
    const calls: string[] = []
    const contest = (id: string) => ({ id, org: 'ICPC', city_cn: '', name: id, sheets: { 正式队伍: [] } })
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url)
      if (url.endsWith('contests.json')) return json([{ id: 'a', name: 'A', org: 'ICPC' }, { id: 'b', name: 'B', org: 'CCPC' }])
      const id = url.split('/').pop()!.replace('.json', '')
      return json(contest(id))
    }))
    const core = createYearCore({ base: '/' })
    const progress: string[] = []
    await core.summaryRows('2025', (d, t) => progress.push(`${d}/${t}`))
    await core.yearDataset('2025')
    expect(progress).toEqual(['0/2', '1/2', '2/2'])
    expect(calls.filter(u => u.endsWith('/a.json'))).toHaveLength(1)
    expect(calls.filter(u => u.endsWith('/b.json'))).toHaveLength(1)
  })

  it('evictExcept 只保留指定年份：被淘汰的年份重新请求', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url)
      if (url.endsWith('contests.json')) return json([{ id: 'a', name: 'A', org: 'ICPC' }])
      return json({ id: 'a', org: 'ICPC', city_cn: '', name: 'A', sheets: { 正式队伍: [] } })
    }))
    const core = createYearCore({ base: '/' })
    const contestCalls = () => calls.filter(u => u === '/data/2025/a.json').length

    await core.summaryRows('2025')
    await core.summaryRows('2026')
    expect(contestCalls()).toBe(1)

    core.evictExcept('2026')
    await core.summaryRows('2025')
    expect(contestCalls()).toBe(2)
  })
})
