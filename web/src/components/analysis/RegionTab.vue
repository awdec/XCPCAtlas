<script setup>
import { ref, computed } from 'vue'
import AnalysisChart from './AnalysisChart.vue'
import { computeRegionStats, MEDAL_ORDER, MEDAL_LABELS, MEDAL_COLORS, fmtPct } from '../../utils/analysis'

const props = defineProps({
  dataset: { type: Object, required: true },
})

const stats = computed(() => computeRegionStats(props.dataset))

// 各赛站获奖人数（选手口径，堆叠、金牌段在柱顶）
const perSiteOption = computed(() => {
  const tiers = [...MEDAL_ORDER].reverse()
  const rows = stats.value.perSite
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const total = params.reduce((s, p) => s + (p.value || 0), 0)
        const lines = [...params]
          .sort((a, b) => b.seriesIndex - a.seriesIndex)
          .map(p => `${p.marker}${p.seriesName}：${p.value} 人`)
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
})

// 跨赛站获奖迁移矩阵
const regionId = ref(null)
const regionOptions = computed(() => stats.value.perSite.map(r => ({ id: r.regionId, name: r.name })))
const activeRegion = computed(() => regionId.value ?? stats.value.perSite[0]?.regionId)
const activeRegionName = computed(() => {
  const r = stats.value.perSite.find(x => x.regionId === activeRegion.value)
  return r ? r.name : ''
})

const migrationRows = computed(() => {
  const rows = stats.value.migration[activeRegion.value]
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
})

const matrixOption = computed(() => {
  const rows = migrationRows.value
  const data = []
  rows.forEach((row, i) => {
    row.cells.forEach((c, j) => {
      if (row.total > 0) data.push([j, i, Number((c.pct * 100).toFixed(1)), c.n])
    })
  })
  return {
    tooltip: {
      formatter: (p) => {
        const rowTier = MEDAL_ORDER[p.value[1]]
        const colTier = MEDAL_ORDER[p.value[0]]
        const total = rows[p.value[1]].total
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
      formatter: v => v + '%',
      inRange: { color: ['#f3f7fd', '#b3d1f5', '#6ba3e8', '#2f6fce'] },
    },
    series: [{
      type: 'heatmap',
      label: { show: true, formatter: (p) => p.value[2] + '%' },
      data,
    }],
  }
})

const cellText = (c) => (c.n === 0 && c.pct === 0) ? '—' : `${c.n}（${fmtPct(c.pct)}）`
</script>

<template>
  <div>
    <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
      <h3 class="text-base font-semibold text-gray-800 mb-1">各赛站获奖人数</h3>
      <p class="text-xs text-gray-400 mb-2">选手口径：每名选手在每个赛站只计一次（取该站最好成绩），与总览页的队伍口径不同</p>
      <AnalysisChart :option="perSiteOption" height="420px" />
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <div class="flex flex-wrap items-center gap-3 mb-1">
        <h3 class="text-base font-semibold text-gray-800">跨赛站获奖迁移</h3>
        <el-select v-model="regionId" placeholder="选择赛站" size="small" style="width: 11rem">
          <el-option v-for="r in regionOptions" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
      </div>
      <p class="text-xs text-gray-400 mb-2">
        在<b>{{ activeRegionName }}</b>获得某档奖牌的选手，其当年在其他赛站的最好成绩分布；仅统计还参加过其他赛站的选手
      </p>
      <AnalysisChart v-if="migrationRows.length" :option="matrixOption" height="300px" />

      <el-table :data="migrationRows" stripe border size="small" class="mt-4" style="max-width: 760px">
        <el-table-column prop="tier" label="本站奖牌" width="110" align="center" />
        <el-table-column prop="total" label="有其他站记录" width="120" align="center" />
        <el-table-column
          v-for="t in MEDAL_ORDER"
          :key="t"
          align="center"
          min-width="110"
        >
          <template #header>
            <span>其他站最好{{ MEDAL_LABELS[t] }}</span>
          </template>
          <template #default="{ row }">
            {{ cellText(row.cells[MEDAL_ORDER.indexOf(t)]) }}
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
