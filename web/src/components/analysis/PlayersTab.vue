<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AnalysisChart from './AnalysisChart.vue'
import { computePlayerStats, MEDAL_ORDER, MEDAL_LABELS, MEDAL_COLORS, fmtPct } from '../../utils/analysis'

const props = defineProps({
  dataset: { type: Object, required: true },
  year: { type: String, required: true },
  // gen_trajectories.py 预生成数据（含 first_best_tiers / all_time_best_tiers）；null = 加载失败
  trajectories: { type: Object, default: null },
})

const router = useRouter()

const stats = computed(() => computePlayerStats(props.dataset))

// 获奖分布饼图
const total = computed(() => MEDAL_ORDER.reduce((s, t) => s + stats.value.tierCounts[t], 0))
const pieOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: (p) => `${p.name}选手：${p.value} 人（${p.percent}%）` },
  legend: { bottom: 0 },
  series: [{
    type: 'pie',
    radius: ['0%', '62%'],
    center: ['50%', '44%'],
    label: { formatter: '{b}\n{d}%' },
    data: MEDAL_ORDER
      .map(t => ({ name: MEDAL_LABELS[t], value: stats.value.tierCounts[t], itemStyle: { color: MEDAL_COLORS[t] } }))
      .filter(d => d.value > 0),
  }],
}))

// 参赛场次 × 无奖牌率（柱 + 折线双轴）
const partOption = computed(() => {
  const b = stats.value.participation
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const i = params[0].dataIndex
        const d = b[i]
        return `${d.label}<br/>${params.map(p => `${p.marker}${p.seriesName}：${p.seriesIndex === 0 ? d.n + ' 人' : fmtPct(d.ironRate)}`).join('<br/>')}`
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
        label: { show: true, position: 'top', formatter: ({ value }) => value + '%' },
        data: b.map(d => Number((d.ironRate * 100).toFixed(1))),
      },
    ],
  }
})

// 排名稳定性散点（≥2 场选手）
const stabilityPoints = computed(() => stats.value.stability)
const scatterOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (p) => {
      const d = p.data[2]
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
    data: stabilityPoints.value
      .filter(s => s.tier === tier)
      .map(s => [s.mean, s.std, { name: s.name, school: s.school, tier, n: s.n, mean: s.mean, std: s.std, range: s.range }]),
  })),
}))

// 散点点击 → 选手个人页（个人页按姓名检索，与全站选手链接口径一致）
const onScatterClick = (params) => {
  if (params.componentType !== 'series' || params.seriesType !== 'scatter') return
  const meta = params.data?.[2]
  if (meta?.name) router.push(`/${props.year}/player/${encodeURIComponent(meta.name)}`)
}

// 各档稳定性汇总
const aggRows = computed(() => stats.value.stabilityAgg.map(a => ({
  tier: MEDAL_LABELS[a.tier],
  n: a.n,
  avgRange: a.n ? a.avgRange.toFixed(1) : '-',
  avgStd: a.n ? a.avgStd.toFixed(1) : '-',
})))

// 「第一次最高获奖」（预生成数据）：当年获奖且档位为个人历史新高（含首次获奖）的选手数
const FIRST_BEST_TIERS = ['gold', 'silver', 'bronze']
const firstBestRows = computed(() => FIRST_BEST_TIERS.map(t => ({
  tier: MEDAL_LABELS[t],
  n: props.trajectories?.first_best_tiers?.[t] ?? 0,
  cumulative: props.trajectories?.all_time_best_tiers?.[t] ?? '—',
})))
const firstBestTotal = computed(() => firstBestRows.value.reduce((s, r) => s + r.n, 0))
</script>

<template>
  <div>
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
      <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 class="text-base font-semibold text-gray-800 mb-1">选手获奖分布</h3>
        <p class="text-xs text-gray-400 mb-2">按 学校+姓名 去重共 {{ total }} 人，取当年最高奖牌</p>
        <AnalysisChart :option="pieOption" height="340px" />
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 class="text-base font-semibold text-gray-800 mb-1">参赛场次与获奖率</h3>
        <p class="text-xs text-gray-400 mb-2">无奖牌率 = 该场次档内最高仅铁牌（未获奖）的选手占比</p>
        <AnalysisChart :option="partOption" height="340px" />
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
      <h3 class="text-base font-semibold text-gray-800 mb-1">第一次最高获奖</h3>
      <p v-if="trajectories" class="text-xs text-gray-400 mb-2">
        选手数统计当年创造个人历史最好成绩的获奖选手，共 {{ firstBestTotal }} 人；至今累计数统计 2020 年至 {{ year }} 年，每人仅计截至该年的最高奖牌
      </p>
      <el-table v-if="trajectories" :data="firstBestRows" stripe border style="width: 480px; margin-left: auto; margin-right: auto; font-size: 16px">
        <el-table-column width="140" align="center">
          <template #header>
            <span>奖牌档
              <el-tooltip placement="top" :show-after="200">
                <template #content>
                  <div class="max-w-xs leading-relaxed">先看选手当年的最高奖牌档，若此前所有年份都未获得过不低于该档的奖牌（即当年为个人历史最好成绩，含首次获奖），则计入该档</div>
                </template>
                <span class="text-gray-400 cursor-help ml-0.5">ⓘ</span>
              </el-tooltip>
            </span>
          </template>
          <template #default="{ row }">
            <span :class="{ 'text-yellow-600 font-semibold': row.tier === '金牌', 'text-gray-500 font-semibold': row.tier === '银牌', 'text-amber-700 font-semibold': row.tier === '铜牌' }">{{ row.tier }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="n" label="选手数" width="160" align="center" />
        <el-table-column prop="cumulative" label="至今累计数" width="180" align="center">
          <template #header>
            <span>至今累计数
              <el-tooltip placement="top" :show-after="200">
                <template #content>
                  <div class="max-w-xs leading-relaxed">统计 2020 年至 {{ year }} 年（含）的全部记录，按学校+姓名去重</div>
                </template>
                <span class="text-gray-400 cursor-help ml-0.5">ⓘ</span>
              </el-tooltip>
            </span>
          </template>
        </el-table-column>
      </el-table>
      <p v-else class="text-sm text-gray-500 py-4 text-center">第一次最高获奖数据暂不可用</p>
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
      <h3 class="text-base font-semibold text-gray-800 mb-1">多场选手的排名稳定性</h3>
      <p class="text-xs text-gray-400 mb-2">
        仅统计参赛 ≥2 场的选手（共 {{ stabilityPoints.length }} 人）；排名跨赛区可比性有限，仅作趋势参考；点击数据点可跳转选手个人页
      </p>
      <AnalysisChart :option="scatterOption" height="460px" @click="onScatterClick" />
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 class="text-base font-semibold text-gray-800 mb-3">各奖牌档稳定性汇总</h3>
      <el-table :data="aggRows" stripe border style="width: 640px; margin-left: auto; margin-right: auto; font-size: 16px">
        <el-table-column prop="tier" width="120" align="center">
          <template #header>
            <span>奖牌档
              <el-tooltip placement="top" :show-after="200">
                <template #content>
                  <div class="max-w-xs leading-relaxed">按选手当年所有赛区的最高奖牌档归档</div>
                </template>
                <span class="text-gray-400 cursor-help ml-0.5">ⓘ</span>
              </el-tooltip>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="n" width="140" align="center">
          <template #header>
            <span>多场选手数
              <el-tooltip placement="top" :show-after="200">
                <template #content>
                  <div class="max-w-xs leading-relaxed">该奖牌档中参加了 2 场及以上比赛的选手人数（按 学校+姓名 去重）。排名极差和标准差仅对这些选手计算；单场参赛的选手没有跨场次波动，不计入。</div>
                </template>
                <span class="text-gray-400 cursor-help ml-0.5">ⓘ</span>
              </el-tooltip>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="avgRange" width="180" align="center">
          <template #header>
            <span>排名极差的平均值
              <el-tooltip placement="top" :show-after="200">
                <template #content>
                  <div class="max-w-xs leading-relaxed">对每名选手，取其各场次名次的极差（最差名次 − 最好名次）；再对同档所有多场选手取平均。衡量典型选手跨场次的排名波动幅度。</div>
                </template>
                <span class="text-gray-400 cursor-help ml-0.5">ⓘ</span>
              </el-tooltip>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="avgStd" width="200" align="center">
          <template #header>
            <span>排名标准差的平均值
              <el-tooltip placement="top" :show-after="200">
                <template #content>
                  <div class="max-w-xs leading-relaxed">对每名选手，计算其各场次名次的标准差；再对同档所有多场选手取平均。标准差越小，说明该选手发挥越稳定。</div>
                </template>
                <span class="text-gray-400 cursor-help ml-0.5">ⓘ</span>
              </el-tooltip>
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
