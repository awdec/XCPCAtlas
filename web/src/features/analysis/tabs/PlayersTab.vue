<script setup lang="ts">
/**
 * 选手分析：获奖分布饼图、参赛场次×无奖牌率、第一次最高获奖（预生成数据）、
 * 排名稳定性散点（点击数据点跳转选手个人页；Ctrl/中键新标签，D5）+ 汇总表（ⓘ 原文）。
 */
import { computed } from 'vue'
import { computePlayerStats, MEDAL_ORDER } from '@/domain/analysis'
import type { YearDataset } from '@/domain/types'
import type { Trajectories } from '@/domain/types'
import { playersAggRows, playersFirstBestRows, playersPartOption, playersPieOption, playersScatterOption } from '../charts/options'
import ChartBox from '../charts/ChartBox.vue'
import SectionCard from '@/shared/components/SectionCard.vue'
import DataTable from '@/shared/components/DataTable.vue'
import type { Column } from '@/shared/components/data-table'

const props = defineProps<{ dataset: YearDataset; year: string; trajectories: Trajectories | null }>()
const stats = computed(() => computePlayerStats(props.dataset))
const total = computed(() => MEDAL_ORDER.reduce((s, t) => s + stats.value.tierCounts[t], 0))
const pieOption = computed(() => playersPieOption(stats.value))
const partOption = computed(() => playersPartOption(stats.value))
const scatterOption = computed(() => playersScatterOption(stats.value))
const aggRows = computed(() => playersAggRows(stats.value))
const firstBest = computed(() => playersFirstBestRows(props.trajectories))

// 散点点击 → 选手个人页（个人页按姓名检索，与全站选手链接口径一致）
const scatterLink = (params: { componentType?: string; seriesType?: string; data?: unknown }) => {
  if (params.componentType !== 'series' || params.seriesType !== 'scatter') return null
  const meta = (params.data as unknown[] | undefined)?.[2] as { name?: string } | undefined
  return meta?.name ? `/${props.year}/player/${encodeURIComponent(meta.name)}` : null
}

type FirstBestRow = ReturnType<typeof playersFirstBestRows>['rows'][number]
const tierTextClass = (t: string) => ({ 金牌: 'text-medal-gold-text font-semibold', 银牌: 'text-medal-silver-text font-semibold', 铜牌: 'text-medal-bronze-text font-semibold' } as Record<string, string>)[t] ?? ''
const firstBestCols = computed<Column<FirstBestRow>[]>(() => [
  { key: 'tier', label: '奖牌档', width: 140, align: 'center', value: r => r.tier, hint: '先看选手当年的最高奖牌档，若此前所有年份都未获得过不低于该档的奖牌（即当年为个人历史最好成绩，含首次获奖），则计入该档' },
  { key: 'n', label: '选手数', width: 160, align: 'center', value: r => r.n },
  { key: 'cumulative', label: '至今累计数', width: 180, align: 'center', value: r => r.cumulative, hint: `统计 2020 年至 ${props.year} 年（含）的全部记录，按学校+姓名去重` },
])

type AggRow = ReturnType<typeof playersAggRows>[number]
const aggCols: Column<AggRow>[] = [
  { key: 'tier', label: '奖牌档', width: 120, align: 'center', value: r => r.tier, hint: '按选手当年所有赛区的最高奖牌档归档' },
  { key: 'n', label: '多场选手数', width: 140, align: 'center', value: r => r.n, hint: '该奖牌档中参加了 2 场及以上比赛的选手人数（按 学校+姓名 去重）。排名极差和标准差仅对这些选手计算；单场参赛的选手没有跨场次波动，不计入。' },
  { key: 'avgRange', label: '排名极差的平均值', width: 180, align: 'center', value: r => r.avgRange, hint: '对每名选手，取其各场次名次的极差（最差名次 − 最好名次）；再对同档所有多场选手取平均。衡量典型选手跨场次的排名波动幅度。' },
  { key: 'avgStd', label: '排名标准差的平均值', width: 200, align: 'center', value: r => r.avgStd, hint: '对每名选手，计算其各场次名次的标准差；再对同档所有多场选手取平均。标准差越小，说明该选手发挥越稳定。' },
]
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard title="选手获奖分布" :description="`按 学校+姓名 去重共 ${total} 人，取当年最高奖牌`" reveal>
        <ChartBox :option="pieOption" height="340px" label="选手获奖分布饼图" />
      </SectionCard>
      <SectionCard title="参赛场次与获奖率" description="无奖牌率 = 该场次档内最高仅铁牌（未获奖）的选手占比" reveal>
        <ChartBox :option="partOption" height="340px" label="参赛场次与无奖牌率" />
      </SectionCard>
    </div>

    <SectionCard title="第一次最高获奖" reveal>
      <template v-if="trajectories">
        <p class="mb-3 text-xs text-fg-subtle">
          选手数统计当年创造个人历史最好成绩的获奖选手，共 {{ firstBest.total }} 人；至今累计数统计 2020 年至 {{ year }} 年，每人仅计截至该年的最高奖牌
        </p>
        <DataTable :columns="firstBestCols" :rows="firstBest.rows" :row-key="r => r.tier" caption="第一次最高获奖" :width="480" size="lg" max-height="none">
          <template #cell-tier="{ row }"><span :class="tierTextClass(row.tier)">{{ row.tier }}</span></template>
        </DataTable>
      </template>
      <p v-else class="py-4 text-center text-sm text-fg-subtle">第一次最高获奖数据暂不可用</p>
    </SectionCard>

    <SectionCard
      title="多场选手的排名稳定性"
      :description="`仅统计参赛 ≥2 场的选手（共 ${stats.stability.length} 人）；排名跨赛区可比性有限，仅作趋势参考；点击数据点可跳转选手个人页`"
      reveal
    >
      <ChartBox :option="scatterOption" height="460px" label="多场选手排名稳定性散点图" :link-resolver="scatterLink" />
    </SectionCard>

    <SectionCard title="各奖牌档稳定性汇总" reveal>
      <DataTable :columns="aggCols" :rows="aggRows" :row-key="r => r.tier" caption="各奖牌档稳定性汇总" :width="640" size="lg" max-height="none" />
    </SectionCard>
  </div>
</template>
