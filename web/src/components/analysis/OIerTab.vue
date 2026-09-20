<script setup>
import { ref, computed } from 'vue'
import AnalysisChart from './AnalysisChart.vue'
import {
  computeOIerStats, computeOIAwardStats,
  MEDAL_ORDER, MEDAL_LABELS, MEDAL_COLORS, fmtPct,
} from '../../utils/analysis'

const props = defineProps({
  dataset: { type: Object, required: true },
})

const stats = computed(() => computeOIerStats(props.dataset))

// 最高 OI 奖项分布：金/银/铜三个奖牌档共享赛区筛选（null = 全部）
const awardRegion = ref(null)
const regionOptions = computed(() => {
  const seen = new Map()
  for (const t of props.dataset.teams) {
    if (!seen.has(t.regionId)) seen.set(t.regionId, t.regionName)
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }))
})
const tierSections = [
  { tier: 'gold', name: '金牌选手' },
  { tier: 'silver', name: '银牌选手' },
  { tier: 'bronze', name: '铜牌选手' },
]
const awardStatsByTier = computed(() => Object.fromEntries(
  tierSections.map(s => [s.tier, computeOIAwardStats(props.dataset, awardRegion.value, s.tier)])
))

// 各奖牌档选手中 OIer 占比
const playerRateOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const tier = MEDAL_ORDER[params[0].dataIndex]
      const s = stats.value.playerTiers[tier]
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
      const s = stats.value.playerTiers[t]
      return { value: Number((s.rate * 100).toFixed(1)), itemStyle: { color: MEDAL_COLORS[t] } }
    }),
    label: { show: true, position: 'top', formatter: ({ value }) => value + '%' },
    barMaxWidth: 60,
  }],
}))

// 各奖牌档队伍的 OIer 人数构成（堆叠百分比）
const oiColors = ['#dcdfe6', '#a0cfff', '#409eff', '#1d6fd8']
// OI 奖项等级配色（0~3 沿用上面的蓝色梯度，IOI 用金牌色）
const oiLevelColors = ['#dcdfe6', '#a0cfff', '#409eff', '#1d6fd8', '#e6a23c']
const teamCompOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const tier = MEDAL_ORDER[params[0].dataIndex]
      const s = stats.value.teamTiers[tier]
      const lines = params.map(p => `${p.marker}${p.seriesName}：${s.counts[p.seriesIndex]} 队（${p.value}%）`)
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
  series: [0, 1, 2, 3].map(n => ({
    name: `${n} 名 OIer`,
    type: 'bar',
    stack: 'total',
    barMaxWidth: 60,
    itemStyle: { color: oiColors[n] },
    data: MEDAL_ORDER.map(t => {
      const s = stats.value.teamTiers[t]
      return s.total ? Number((s.counts[n] / s.total * 100).toFixed(1)) : 0
    }),
  })),
}))

// 各奖牌档最高 OI 奖项分布（横向柱，按等级排序）
const buildAwardOption = (stats) => {
  const items = stats.items
  // "该档及以上"：等级更高、或同等级且档位（国际金/金/银/铜）不低于该条的人数之和
  const atLeastCount = (item) => items.reduce(
    (s, e) => (e.level > item.level || (e.level === item.level && e.rank <= item.rank) ? s + e.count : s), 0
  )
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params[0]
        const d = items[p.dataIndex]
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
const awardOptionsByTier = computed(() => Object.fromEntries(
  tierSections.map(s => [s.tier, buildAwardOption(awardStatsByTier.value[s.tier])])
))
const awardChartHeight = (stats) => Math.max(320, stats.items.length * 26 + 60) + 'px'
</script>

<template>
  <div>
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 class="text-base font-semibold text-gray-800 mb-1">各奖牌档选手的 OIer 占比</h3>
        <p class="text-xs text-gray-400 mb-2">选手按 学校+姓名 跨赛区去重，取当年最高奖牌</p>
        <AnalysisChart :option="playerRateOption" />
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 class="text-base font-semibold text-gray-800 mb-1">各奖牌档队伍的 OIer 人数构成</h3>
        <p class="text-xs text-gray-400 mb-2">按队伍内 OIer 人数（0~3 名）统计队伍占比</p>
        <AnalysisChart :option="teamCompOption" />
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mt-4">
      <div class="flex flex-wrap items-center gap-3 mb-1">
        <h3 class="text-base font-semibold text-gray-800">
          <el-tooltip placement="top" :show-after="200">
            <template #content>
              <div class="max-w-xs leading-relaxed">
                金/银/铜牌选手指当年获得过对应档奖牌的选手（按 学校+姓名 跨赛区去重）。同一选手跨赛站获得过多个奖牌档时，会同时计入多张图（并非按全年最高奖牌互斥划分）。
              </div>
            </template>
            <span class="text-gray-400 cursor-help mr-1">ⓘ</span>
          </el-tooltip>
          各奖牌档选手的最高 OI 奖项分布
        </h3>
        <el-select
          v-model="awardRegion"
          placeholder="全部赛区"
          clearable
          size="small"
          style="width: 8rem"
        >
          <el-option v-for="r in regionOptions" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
      </div>
      <p class="text-xs text-gray-400 mb-2">
        奖项等级：IOI &gt; NOI &gt; WC 级 &gt; 提高 &gt; 入门
      </p>
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div v-for="t in tierSections" :key="t.tier">
          <h4 class="text-sm font-semibold text-gray-700 mb-0.5">{{ t.name }}</h4>
          <p class="text-xs text-gray-400 mb-2">统计 {{ awardStatsByTier[t.tier].total }} 名，其中 {{ awardStatsByTier[t.tier].withOi }} 人有 OI 记录</p>
          <AnalysisChart
            v-if="awardStatsByTier[t.tier].items.length"
            :option="awardOptionsByTier[t.tier]"
            :height="awardChartHeight(awardStatsByTier[t.tier])"
          />
          <p v-else class="text-sm text-gray-500 py-8 text-center">该范围内{{ t.name }}均无 OI 记录。</p>
        </div>
      </div>
    </div>
  </div>
</template>
