/**
 * 数据分析页全部图表 option 构建器（纯函数）——由旧 components/analysis/*.vue 逐字移植（计划 M5-T2）。
 * 遵守 docs/analysis-page.md §5：金牌段在柱顶（series 用 reverse 后的 MEDAL_ORDER）、tooltip 按
 * seriesIndex 降序、横向条形用 yAxis.inverse 而非 reverse 数据。golden 测试固定其输出，勿改结构。
 * 暗色主题只影响坐标轴/网格等非数据元素（由 ECharts 主题注册），数据色不变。
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- ECharts 回调参数形态多变，按旧实现保持宽松 */
import {
  MEDAL_ORDER, MEDAL_LABELS, MEDAL_COLORS, fmtPct,
  type Overview, type RegionStats, type PlayerStats, type OIerStats, type OIAwardStats, type SchoolStats,
} from '@/domain/analysis'
import type { MedalTier, Trajectories, YearDataset } from '@/domain/types'

type P = any
export type ChartOption = Record<string, any>

// ---------- OverviewTab.vue ----------
export function overviewCards(overview: Overview) {
  return [
    { label: '赛区数', value: overview.contests, suffix: '' },
    { label: '队伍数', value: overview.teams, suffix: '' },
    { label: '参赛人次', value: overview.appearances, suffix: '' },
    { label: '去重选手', value: overview.players, suffix: '' },
    { label: '金牌选手', value: overview.medalPlayers.gold, suffix: '' },
    { label: 'OIer 选手', value: overview.oierPlayers, suffix: `（${fmtPct(overview.oierRate)}）` },
  ]
}

export function overviewRegionOption(overview: Overview): ChartOption {
  const tiers = [...MEDAL_ORDER].reverse()
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: P) => {
        const lines = [...params]
          .sort((a: P, b: P) => b.seriesIndex - a.seriesIndex)
          .map((p: P) => `${p.marker}${p.seriesName}：${p.value} 队`)
        return `${params[0].axisValue}<br/>` + lines.join('<br/>')
      },
    },
    legend: { top: 0, data: MEDAL_ORDER.map(t => MEDAL_LABELS[t]) },
    grid: { left: 50, right: 20, top: 36, bottom: 60 },
    xAxis: {
      type: 'category',
      data: overview.perRegion.map(r => r.name),
      axisLabel: { rotate: 30, interval: 0 },
    },
    yAxis: { type: 'value', name: '队伍数' },
    series: tiers.map(tier => ({
      name: MEDAL_LABELS[tier],
      type: 'bar',
      stack: 'total',
      data: overview.perRegion.map(r => r[tier]),
      itemStyle: { color: MEDAL_COLORS[tier] },
      barMaxWidth: 40,
    })),
  }
}

// ---------- RegionTab.vue ----------
export function regionPerSiteOption(stats: RegionStats): ChartOption {
  const tiers = [...MEDAL_ORDER].reverse()
  const rows = stats.perSite
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: P) => {
        const total = params.reduce((s: number, p: P) => s + (p.value || 0), 0)
        const lines = [...params]
          .sort((a: P, b: P) => b.seriesIndex - a.seriesIndex)
          .map((p: P) => `${p.marker}${p.seriesName}：${p.value} 人`)
        return `${params[0].axisValue}（共 ${total} 人）<br/>` + lines.join('<br/>')
      },
    },
    legend: { top: 0, data: MEDAL_ORDER.map(t => MEDAL_LABELS[t]) },
    grid: { left: 50, right: 20, top: 36, bottom: 60 },
    xAxis: {
      type: 'category',
      data: rows.map(r => r.name),
      axisLabel: { rotate: 30, interval: 0 },
    },
    yAxis: { type: 'value', name: '人数' },
    series: tiers.map(tier => ({
      name: MEDAL_LABELS[tier],
      type: 'bar',
      stack: 'total',
      barMaxWidth: 40,
      itemStyle: { color: MEDAL_COLORS[tier] },
      data: rows.map(r => r[tier]),
    })),
  }
}

export interface MigrationCell { tier: MedalTier; n: number; pct: number }
export interface MigrationTableRow { tier: string; total: number; cells: MigrationCell[] }
export function regionMigrationRows(stats: RegionStats, activeRegion: string | null | undefined): MigrationTableRow[] {
  const rows = activeRegion == null ? undefined : stats.migration[activeRegion]
  if (!rows) return []
  return MEDAL_ORDER.map(tier => {
    const r = rows[tier]
    return {
      tier: MEDAL_LABELS[tier],
      total: r.total,
      cells: MEDAL_ORDER.map(t2 => {
        const n = r.other[t2]
        return { tier: t2, n, pct: r.total ? n / r.total : 0 }
      }),
    }
  })
}

export function regionMatrixOption(rows: MigrationTableRow[]): ChartOption {
  const data: [number, number, number, number][] = []
  rows.forEach((row, i) => {
    row.cells.forEach((c, j) => {
      if (row.total > 0) data.push([j, i, Number((c.pct * 100).toFixed(1)), c.n])
    })
  })
  return {
    tooltip: {
      formatter: (p: P) => {
        const rowTier = MEDAL_ORDER[p.value[1]]!
        const colTier = MEDAL_ORDER[p.value[0]]!
        const total = rows[p.value[1]]!.total
        return `本站${MEDAL_LABELS[rowTier]}（${total} 人）→ 其他站最好${MEDAL_LABELS[colTier]}<br/>${p.value[3]} 人（${p.value[2]}%）`
      },
    },
    grid: { left: 80, right: 90, top: 10, bottom: 40 },
    xAxis: { type: 'category', data: MEDAL_ORDER.map(t => MEDAL_LABELS[t]), name: '其他站最好成绩', nameLocation: 'middle', nameGap: 32 },
    yAxis: { type: 'category', data: MEDAL_ORDER.map(t => MEDAL_LABELS[t]), inverse: true, name: '本站奖牌' },
    visualMap: {
      min: 0,
      max: 100,
      calculable: false,
      orient: 'vertical',
      right: 0,
      top: 'center',
      formatter: (v: number) => v + '%',
      inRange: { color: ['#f3f7fd', '#b3d1f5', '#6ba3e8', '#2f6fce'] },
    },
    series: [{
      type: 'heatmap',
      label: { show: true, formatter: (p: P) => p.value[2] + '%' },
      data,
    }],
  }
}

export const regionCellText = (c: MigrationCell): string => (c.n === 0 && c.pct === 0) ? '—' : `${c.n}（${fmtPct(c.pct)}）`

// ---------- PlayersTab.vue ----------
export function playersPieOption(stats: PlayerStats): ChartOption {
  return {
    tooltip: { trigger: 'item', formatter: (p: P) => `${p.name}选手：${p.value} 人（${p.percent}%）` },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['0%', '62%'],
      center: ['50%', '44%'],
      label: { formatter: '{b}\n{d}%' },
      data: MEDAL_ORDER
        .map(t => ({ name: MEDAL_LABELS[t], value: stats.tierCounts[t], itemStyle: { color: MEDAL_COLORS[t] } }))
        .filter(d => d.value > 0),
    }],
  }
}

export function playersPartOption(stats: PlayerStats): ChartOption {
  const b = stats.participation
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: P) => {
        const i = params[0].dataIndex
        const d = b[i]!
        return `${d.label}<br/>${params.map((p: P) => `${p.marker}${p.seriesName}：${p.seriesIndex === 0 ? d.n + ' 人' : fmtPct(d.ironRate)}`).join('<br/>')}`
      },
    },
    legend: { top: 0 },
    grid: { left: 60, right: 60, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: b.map(d => d.label), axisLabel: { interval: 0 } },
    yAxis: [
      { type: 'value', name: '选手数' },
      { type: 'value', name: '无奖牌率', axisLabel: { formatter: '{value}%' }, max: 100, splitLine: { show: false } },
    ],
    series: [
      {
        name: '选手数', type: 'bar', yAxisIndex: 0, barMaxWidth: 50,
        itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] },
        data: b.map(d => d.n),
      },
      {
        name: '无奖牌率', type: 'line', yAxisIndex: 1,
        itemStyle: { color: '#e6a23c' }, lineStyle: { width: 2 },
        label: { show: true, position: 'top', formatter: ({ value }: P) => value + '%' },
        data: b.map(d => Number((d.ironRate * 100).toFixed(1))),
      },
    ],
  }
}

export function playersScatterOption(stats: PlayerStats): ChartOption {
  const stabilityPoints = stats.stability
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: P) => {
        const d = p.data[2] as { name: string; school: string; tier: MedalTier; n: number; mean: number; std: number; range: number }
        return `${d.name}（${d.school}）<br/>参赛 ${d.n} 场 · 最高${MEDAL_LABELS[d.tier]}<br/>平均排名 ${d.mean.toFixed(1)} · 标准差 ${d.std.toFixed(1)} · 极差 ${d.range}`
      },
    },
    legend: { top: 0 },
    grid: { left: 60, right: 30, top: 36, bottom: 50 },
    xAxis: { type: 'value', name: '平均排名', min: 0 },
    yAxis: { type: 'value', name: '排名标准差' },
    series: MEDAL_ORDER.map(tier => ({
      name: MEDAL_LABELS[tier],
      type: 'scatter',
      symbolSize: 8,
      itemStyle: { color: MEDAL_COLORS[tier], opacity: 0.75, cursor: 'pointer' },
      data: stabilityPoints
        .filter(s => s.tier === tier)
        .map(s => [s.mean, s.std, { name: s.name, school: s.school, tier, n: s.n, mean: s.mean, std: s.std, range: s.range }]),
    })),
  }
}

export function playersAggRows(stats: PlayerStats) {
  return stats.stabilityAgg.map(a => ({
    tier: MEDAL_LABELS[a.tier],
    n: a.n,
    avgRange: a.n ? a.avgRange.toFixed(1) : '-',
    avgStd: a.n ? a.avgStd.toFixed(1) : '-',
  }))
}

export function playersFirstBestRows(trajectories: Trajectories | null | undefined) {
  const FIRST_BEST_TIERS = ['gold', 'silver', 'bronze'] as const
  const rows = FIRST_BEST_TIERS.map(t => ({
    tier: MEDAL_LABELS[t],
    n: trajectories?.first_best_tiers?.[t] ?? 0,
    cumulative: trajectories?.all_time_best_tiers?.[t] ?? '—',
  }))
  return { rows, total: rows.reduce((s, r) => s + r.n, 0) }
}

// ---------- OIerTab.vue ----------
export function oierPlayerRateOption(stats: OIerStats): ChartOption {
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: P) => {
        const tier = MEDAL_ORDER[params[0].dataIndex]!
        const s = stats.playerTiers[tier]
        return `${MEDAL_LABELS[tier]}选手<br/>OIer：${s.oier} / ${s.total}（${fmtPct(s.rate)}）`
      },
    },
    grid: { left: 50, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: MEDAL_ORDER.map(t => MEDAL_LABELS[t]),
      axisLabel: { interval: 0 },
    },
    yAxis: { type: 'value', name: 'OIer 占比', axisLabel: { formatter: '{value}%' }, max: 100 },
    series: [{
      type: 'bar',
      data: MEDAL_ORDER.map(t => {
        const s = stats.playerTiers[t]
        return { value: Number((s.rate * 100).toFixed(1)), itemStyle: { color: MEDAL_COLORS[t] } }
      }),
      label: { show: true, position: 'top', formatter: ({ value }: P) => value + '%' },
      barMaxWidth: 60,
    }],
  }
}

const oiColors = ['#dcdfe6', '#a0cfff', '#409eff', '#1d6fd8']
const oiLevelColors = ['#dcdfe6', '#a0cfff', '#409eff', '#1d6fd8', '#e6a23c']

export function oierTeamCompOption(stats: OIerStats): ChartOption {
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: P) => {
        const tier = MEDAL_ORDER[params[0].dataIndex]!
        const s = stats.teamTiers[tier]
        const lines = params.map((p: P) => `${p.marker}${p.seriesName}：${s.counts[p.seriesIndex]} 队（${p.value}%）`)
        return `${MEDAL_LABELS[tier]}队伍（共 ${s.total} 队）<br/>` + lines.join('<br/>')
      },
    },
    legend: { top: 0 },
    grid: { left: 50, right: 20, top: 36, bottom: 30 },
    xAxis: {
      type: 'category',
      data: MEDAL_ORDER.map(t => MEDAL_LABELS[t]),
      axisLabel: { interval: 0 },
    },
    yAxis: { type: 'value', name: '队伍占比', axisLabel: { formatter: '{value}%' }, max: 100 },
    series: ([0, 1, 2, 3] as const).map(n => ({
      name: `${n} 名 OIer`,
      type: 'bar',
      stack: 'total',
      barMaxWidth: 60,
      itemStyle: { color: oiColors[n] },
      data: MEDAL_ORDER.map(t => {
        const s = stats.teamTiers[t]
        return s.total ? Number((s.counts[n] / s.total * 100).toFixed(1)) : 0
      }),
    })),
  }
}

export function oierAwardOption(stats: OIAwardStats): ChartOption {
  const items = stats.items
  const atLeastCount = (item: OIAwardStats['items'][number]): number => items.reduce(
    (s, e) => (e.level > item.level || (e.level === item.level && e.rank <= item.rank) ? s + e.count : s), 0
  )
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: P) => {
        const p = params[0]
        const d = items[p.dataIndex]!
        return `${d.label}<br/>人数：${d.count}（${fmtPct(d.count / Math.max(stats.withOi, 1))}）· 该档及以上：${atLeastCount(d)} 人`
      },
    },
    grid: { left: 110, right: 40, top: 10, bottom: 30 },
    xAxis: { type: 'value', name: '人数' },
    yAxis: {
      type: 'category',
      inverse: true,
      data: items.map(d => d.label),
      axisLabel: { width: 100, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      barMaxWidth: 18,
      data: items.map(d => ({
        value: d.count,
        itemStyle: { color: oiLevelColors[d.level], borderRadius: [0, 4, 4, 0] },
      })),
    }],
  }
}

export const oierAwardChartHeight = (stats: OIAwardStats): string => Math.max(320, stats.items.length * 26 + 60) + 'px'

export function oierRegionOptions(dataset: YearDataset) {
  const seen = new Map<string, string>()
  for (const t of dataset.teams) {
    if (!seen.has(t.regionId)) seen.set(t.regionId, t.regionName)
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }))
}

// ---------- SchoolTab.vue ----------
export function schoolDistributionOption(stats: SchoolStats): ChartOption {
  const tiers = [...MEDAL_ORDER].reverse()
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: P) => {
        const lines = [...params]
          .sort((a: P, b: P) => b.seriesIndex - a.seriesIndex)
          .map((p: P) => `${p.marker}${p.seriesName}：${p.value} 人`)
        return `${params[0].axisValue}<br/>` + lines.join('<br/>')
      },
    },
    legend: { top: 0, data: MEDAL_ORDER.map(t => MEDAL_LABELS[t]) },
    grid: { left: 60, right: 20, top: 36, bottom: 30 },
    xAxis: {
      type: 'category',
      data: stats.tierNames,
      axisLabel: { interval: 0, fontSize: 13 },
    },
    yAxis: { type: 'value', name: '选手数' },
    series: tiers.map(tier => ({
      name: MEDAL_LABELS[tier],
      type: 'bar',
      stack: 'total',
      barMaxWidth: 60,
      itemStyle: { color: MEDAL_COLORS[tier] },
      data: stats.tierNames.map(name => stats.tierStats[name].players[tier]),
    })),
  }
}

export function schoolRateOption(stats: SchoolStats): ChartOption {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => v + '%' },
    legend: { top: 0 },
    grid: { left: 50, right: 20, top: 36, bottom: 30 },
    xAxis: {
      type: 'category',
      data: stats.tierNames,
      axisLabel: { interval: 0, fontSize: 13 },
    },
    yAxis: { type: 'value', name: '占比', axisLabel: { formatter: '{value}%' }, max: 100 },
    series: [
      {
        name: '金牌率',
        type: 'bar',
        barMaxWidth: 50,
        itemStyle: { color: '#e6a23c' },
        label: { show: true, position: 'top', formatter: ({ value }: P) => value + '%' },
        data: stats.tierNames.map(name => {
          const s = stats.tierStats[name]
          return Number((s.goldRate * 100).toFixed(1))
        }),
      },
      {
        name: '奖牌率（金/银/铜）',
        type: 'bar',
        barMaxWidth: 50,
        itemStyle: { color: '#409eff' },
        label: { show: true, position: 'top', formatter: ({ value }: P) => value + '%' },
        data: stats.tierNames.map(name => {
          const s = stats.tierStats[name]
          return Number((s.medalRate * 100).toFixed(1))
        }),
      },
      {
        name: 'OIer 率',
        type: 'bar',
        barMaxWidth: 50,
        itemStyle: { color: '#67c23a' },
        label: { show: true, position: 'top', formatter: ({ value }: P) => value + '%' },
        data: stats.tierNames.map(name => {
          const s = stats.tierStats[name]
          return Number((s.oierRate * 100).toFixed(1))
        }),
      },
    ],
  }
}

export function schoolTierSummary(stats: SchoolStats) {
  return stats.tierNames.map(name => {
    const s = stats.tierStats[name]
    return { name, teams: s.teams, players: s.total, goldRate: fmtPct(s.goldRate), medalRate: fmtPct(s.medalRate), oierRate: fmtPct(s.oierRate) }
  })
}
