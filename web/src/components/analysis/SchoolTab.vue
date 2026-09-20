<script setup>
import { computed } from 'vue'
import AnalysisChart from './AnalysisChart.vue'
import { computeSchoolStats, MEDAL_ORDER, MEDAL_LABELS, MEDAL_COLORS, fmtPct } from '../../utils/analysis'

const props = defineProps({
  dataset: { type: Object, required: true },
  tags: { type: Object, required: true },
})

const stats = computed(() => computeSchoolStats(props.dataset, props.tags))

// 各学校层次选手的奖牌分布（人数堆叠，自下而上 铁→金，金牌段位于柱顶）
const distributionOption = computed(() => {
  const tiers = [...MEDAL_ORDER].reverse()
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const lines = [...params]
          .sort((a, b) => b.seriesIndex - a.seriesIndex)
          .map(p => `${p.marker}${p.seriesName}：${p.value} 人`)
        return `${params[0].axisValue}<br/>` + lines.join('<br/>')
      },
    },
    legend: { top: 0, data: MEDAL_ORDER.map(t => MEDAL_LABELS[t]) },
    grid: { left: 60, right: 20, top: 36, bottom: 30 },
    xAxis: {
      type: 'category',
      data: stats.value.tierNames,
      axisLabel: { interval: 0, fontSize: 13 },
    },
    yAxis: { type: 'value', name: '选手数' },
    series: tiers.map(tier => ({
      name: MEDAL_LABELS[tier],
      type: 'bar',
      stack: 'total',
      barMaxWidth: 60,
      itemStyle: { color: MEDAL_COLORS[tier] },
      data: stats.value.tierNames.map(name => stats.value.tierStats[name].players[tier]),
    })),
  }
})

// 各学校层次获奖率与 OIer 率对比
const rateOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v + '%' },
  legend: { top: 0 },
  grid: { left: 50, right: 20, top: 36, bottom: 30 },
  xAxis: {
    type: 'category',
    data: stats.value.tierNames,
    axisLabel: { interval: 0, fontSize: 13 },
  },
  yAxis: { type: 'value', name: '占比', axisLabel: { formatter: '{value}%' }, max: 100 },
  series: [
    {
      name: '金牌率',
      type: 'bar',
      barMaxWidth: 50,
      itemStyle: { color: '#e6a23c' },
      label: { show: true, position: 'top', formatter: ({ value }) => value + '%' },
      data: stats.value.tierNames.map(name => {
        const s = stats.value.tierStats[name]
        return Number((s.goldRate * 100).toFixed(1))
      }),
    },
    {
      name: '奖牌率（金/银/铜）',
      type: 'bar',
      barMaxWidth: 50,
      itemStyle: { color: '#409eff' },
      label: { show: true, position: 'top', formatter: ({ value }) => value + '%' },
      data: stats.value.tierNames.map(name => {
        const s = stats.value.tierStats[name]
        return Number((s.medalRate * 100).toFixed(1))
      }),
    },
    {
      name: 'OIer 率',
      type: 'bar',
      barMaxWidth: 50,
      itemStyle: { color: '#67c23a' },
      label: { show: true, position: 'top', formatter: ({ value }) => value + '%' },
      data: stats.value.tierNames.map(name => {
        const s = stats.value.tierStats[name]
        return Number((s.oierRate * 100).toFixed(1))
      }),
    },
  ],
}))

// 各层次概览数字
const tierSummary = computed(() => stats.value.tierNames.map(name => {
  const s = stats.value.tierStats[name]
  return { name, teams: s.teams, players: s.total, goldRate: fmtPct(s.goldRate), medalRate: fmtPct(s.medalRate), oierRate: fmtPct(s.oierRate) }
}))

// 有金牌院校名单的展示配置（title 用于标题/空态文案拼接）
const goldSchoolSections = [
  { tier: '211', title: ' 211 ' },
  { tier: '双非', title: '双非' },
]
</script>

<template>
  <div>
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
      <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 class="text-base font-semibold text-gray-800 mb-1">各学校层次选手的奖牌分布</h3>
        <p class="text-xs text-gray-400 mb-2">选手按 学校+姓名 跨赛区去重，取当年最高奖牌；985 含特殊院校口径</p>
        <AnalysisChart :option="distributionOption" />
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 class="text-base font-semibold text-gray-800 mb-1">各学校层次获奖率与 OIer 率</h3>
        <p class="text-xs text-gray-400 mb-2">金牌率 = 获金牌选手 / 该层次选手；奖牌率 = 获金/银/铜选手 / 该层次选手</p>
        <AnalysisChart :option="rateOption" />
      </div>
    </div>

    <!-- 层次概览表 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
      <h3 class="text-base font-semibold text-gray-800 mb-3">学校层次概览</h3>
      <el-table :data="tierSummary" stripe border size="small">
        <el-table-column prop="name" label="层次" width="100" align="center" />
        <el-table-column prop="teams" label="队伍数" width="100" align="center" />
        <el-table-column prop="players" label="去重选手" width="100" align="center" />
        <el-table-column prop="goldRate" label="金牌率" width="100" align="center" />
        <el-table-column prop="medalRate" label="奖牌率" width="100" align="center" />
        <el-table-column prop="oierRate" label="OIer 率" width="100" align="center" />
      </el-table>
    </div>

    <!-- 无金牌的 985 -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
      <h3 class="text-base font-semibold text-gray-800 mb-1">本年无金牌的 985 院校（{{ stats.noGold985.length }} 所）</h3>
      <p class="text-xs text-gray-400 mb-3">该年有队伍参赛但无队伍获得金牌的 985 院校</p>
      <div v-if="stats.noGold985.length" class="flex flex-wrap gap-2">
        <el-tag
          v-for="school in stats.noGold985"
          :key="school"
          type="danger"
          effect="plain"
          disable-transitions
        >{{ school }}</el-tag>
      </div>
      <p v-else class="text-sm text-gray-500">本届所有参赛的 985 院校均有金牌入账。</p>
    </div>

    <!-- 有金牌的 211 / 双非 -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div
        v-for="g in goldSchoolSections"
        :key="g.tier"
        class="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
      >
        <h3 class="text-base font-semibold text-gray-800 mb-1">本年有金牌的{{ g.title }}院校（{{ stats.goldSchools[g.tier].length }} 所）</h3>
        <p class="text-xs text-gray-400 mb-3">该年至少有一支队伍获得金牌的{{ g.title }}院校</p>
        <div v-if="stats.goldSchools[g.tier].length" class="flex flex-wrap gap-2">
          <el-tag
            v-for="school in stats.goldSchools[g.tier]"
            :key="school"
            type="success"
            effect="plain"
            disable-transitions
          >{{ school }}</el-tag>
        </div>
        <p v-else class="text-sm text-gray-500">本届无{{ g.title }}院校获得金牌。</p>
      </div>
    </div>
  </div>
</template>
