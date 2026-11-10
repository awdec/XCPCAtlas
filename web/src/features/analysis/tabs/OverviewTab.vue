<script setup lang="ts">
/** 总览（OverviewTab）：6 张统计卡片、各赛区队伍奖牌分布、奖牌发放数表格 */
import { computed } from 'vue'
import type { Overview } from '@/domain/analysis'
import { overviewCards, overviewRegionOption } from '../charts/options'
import ChartBox from '../charts/ChartBox.vue'
import SectionCard from '@/shared/components/SectionCard.vue'
import StatCard from '@/shared/components/StatCard.vue'
import DataTable from '@/shared/components/DataTable.vue'
import type { Column } from '@/shared/components/data-table'

const props = defineProps<{ overview: Overview }>()
const cards = computed(() => overviewCards(props.overview))
const regionOption = computed(() => overviewRegionOption(props.overview))
type OrgRow = Overview['orgMedals'][number]
const orgCols: Column<OrgRow>[] = [
  { key: 'org', label: '赛事', width: 100, align: 'center', value: r => r.org },
  { key: 'gold', label: '金牌', align: 'center', value: r => r.gold },
  { key: 'silver', label: '银牌', align: 'center', value: r => r.silver },
  { key: 'bronze', label: '铜牌', align: 'center', value: r => r.bronze },
]
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard v-for="c in cards" :key="c.label" :label="c.label" :value="c.value" :suffix="c.suffix" />
    </div>

    <SectionCard title="各赛区队伍奖牌分布" reveal>
      <ChartBox :option="regionOption" height="420px" label="各赛区队伍奖牌分布（堆叠柱状图）" />
    </SectionCard>

    <SectionCard title="奖牌发放数（CCPC / ICPC）" reveal>
      <DataTable :columns="orgCols" :rows="overview.orgMedals" :row-key="r => r.org" caption="奖牌发放数（CCPC / ICPC）" :width="560" size="lg" max-height="none" />
    </SectionCard>
  </div>
</template>
