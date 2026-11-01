<script setup>
import { computed } from 'vue'
import AnalysisChart from './AnalysisChart.vue'
import { MEDAL_ORDER, MEDAL_LABELS, MEDAL_COLORS, fmtPct } from '../../utils/analysis'

const props = defineProps({
  overview: { type: Object, required: true },
})

const cards = computed(() => [
  { label: '赛区数', value: props.overview.contests, suffix: '' },
  { label: '队伍数', value: props.overview.teams, suffix: '' },
  { label: '参赛人次', value: props.overview.appearances, suffix: '' },
  { label: '去重选手', value: props.overview.players, suffix: '' },
  { label: '金牌选手', value: props.overview.medalPlayers.gold, suffix: '' },
  { label: 'OIer 选手', value: props.overview.oierPlayers, suffix: `（${fmtPct(props.overview.oierRate)}）` },
])

const regionOption = computed(() => {
  // 堆叠顺序自下而上：铁→铜→银→金，使金牌段位于柱顶
  const tiers = [...MEDAL_ORDER].reverse()
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const lines = [...params]
          .sort((a, b) => b.seriesIndex - a.seriesIndex)
          .map(p => `${p.marker}${p.seriesName}：${p.value} 队`)
        return `${params[0].axisValue}<br/>` + lines.join('<br/>')
      },
    },
    legend: { top: 0, data: MEDAL_ORDER.map(t => MEDAL_LABELS[t]) },
    grid: { left: 50, right: 20, top: 36, bottom: 60 },
    xAxis: {
      type: 'category',
      data: props.overview.perRegion.map(r => r.name),
      axisLabel: { rotate: 30, interval: 0 },
    },
    yAxis: { type: 'value', name: '队伍数' },
    series: tiers.map(tier => ({
      name: MEDAL_LABELS[tier],
      type: 'bar',
      stack: 'total',
      data: props.overview.perRegion.map(r => r[tier]),
      itemStyle: { color: MEDAL_COLORS[tier] },
      barMaxWidth: 40,
    })),
  }
})
</script>

<template>
  <div>
    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <div
        v-for="card in cards"
        :key="card.label"
        class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 text-center"
      >
        <div class="text-2xl font-bold text-gray-800">{{ card.value }}<span class="text-sm font-medium text-gray-500">{{ card.suffix }}</span></div>
        <div class="text-xs text-gray-400 mt-1">{{ card.label }}</div>
      </div>
    </div>

    <!-- 各赛区奖牌分布 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 class="text-base font-semibold text-gray-800 mb-1">各赛区队伍奖牌分布</h3>
      <AnalysisChart :option="regionOption" height="420px" />
    </div>

    <!-- 分赛事奖牌汇总 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mt-4">
      <h3 class="text-base font-semibold text-gray-800 mb-3">奖牌发放数（CCPC / ICPC）</h3>
      <el-table :data="props.overview.orgMedals" stripe border style="max-width: 560px; margin: 0 auto; font-size: 16px">
        <el-table-column prop="org" label="赛事" width="100" align="center" />
        <el-table-column prop="gold" label="金牌" align="center" />
        <el-table-column prop="silver" label="银牌" align="center" />
        <el-table-column prop="bronze" label="铜牌" align="center" />
      </el-table>
    </div>
  </div>
</template>
