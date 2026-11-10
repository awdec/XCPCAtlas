<script setup lang="ts">
/** 学校分析：层次奖牌分布、获奖率与 OIer 率、层次概览表、无金牌 985、有金牌 211/双非 */
import { computed } from 'vue'
import { computeSchoolStats } from '@/domain/analysis'
import type { YearDataset } from '@/domain/types'
import type { SchoolTags } from '@/domain/types'
import { schoolDistributionOption, schoolRateOption, schoolTierSummary } from '../charts/options'
import ChartBox from '../charts/ChartBox.vue'
import SectionCard from '@/shared/components/SectionCard.vue'
import DataTable from '@/shared/components/DataTable.vue'
import type { Column } from '@/shared/components/data-table'

const props = defineProps<{ dataset: YearDataset; tags: SchoolTags }>()
const stats = computed(() => computeSchoolStats(props.dataset, props.tags))
const distributionOption = computed(() => schoolDistributionOption(stats.value))
const rateOption = computed(() => schoolRateOption(stats.value))
const tierSummary = computed(() => schoolTierSummary(stats.value))
type SummaryRow = ReturnType<typeof schoolTierSummary>[number]
const cols: Column<SummaryRow>[] = [
  { key: 'name', label: '层次', width: 100, align: 'center', value: r => r.name },
  { key: 'teams', label: '队伍数', width: 100, align: 'center', value: r => r.teams },
  { key: 'players', label: '去重选手', width: 100, align: 'center', value: r => r.players },
  { key: 'goldRate', label: '金牌率', width: 100, align: 'center', value: r => r.goldRate },
  { key: 'medalRate', label: '奖牌率', width: 100, align: 'center', value: r => r.medalRate },
  { key: 'oierRate', label: 'OIer 率', width: 100, align: 'center', value: r => r.oierRate },
]
const goldSchoolSections = [
  { tier: '211' as const, title: ' 211 ' },
  { tier: '双非' as const, title: '双非' },
]
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard title="各学校层次选手的奖牌分布" description="选手按 学校+姓名 跨赛区去重，取当年最高奖牌；985 含特殊院校口径" reveal>
        <ChartBox :option="distributionOption" label="各学校层次选手的奖牌分布" />
      </SectionCard>
      <SectionCard title="各学校层次获奖率与 OIer 率" description="金牌率 = 获金牌选手 / 该层次选手；奖牌率 = 获金/银/铜选手 / 该层次选手" reveal>
        <ChartBox :option="rateOption" label="各学校层次获奖率与 OIer 率" />
      </SectionCard>
    </div>

    <SectionCard title="学校层次概览" reveal>
      <DataTable :columns="cols" :rows="tierSummary" :row-key="r => r.name" caption="学校层次概览" :width="600" size="lg" max-height="none" />
    </SectionCard>

    <SectionCard :title="`本年无金牌的 985 院校（${stats.noGold985.length} 所）`" description="该年有队伍参赛但无队伍获得金牌的 985 院校" reveal>
      <ul v-if="stats.noGold985.length" class="flex flex-wrap gap-2">
        <li v-for="school in stats.noGold985" :key="school" class="rounded-md border border-(--tag-985-border) bg-(--tag-985-bg) px-2 py-0.5 text-sm text-(--tag-985-fg)">{{ school }}</li>
      </ul>
      <p v-else class="text-sm text-fg-subtle">本届所有参赛的 985 院校均有金牌入账。</p>
    </SectionCard>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard
        v-for="g in goldSchoolSections"
        :key="g.tier"
        :title="`本年有金牌的${g.title}院校（${stats.goldSchools[g.tier].length} 所）`"
        :description="`该年至少有一支队伍获得金牌的${g.title}院校`"
        reveal
      >
        <ul v-if="stats.goldSchools[g.tier].length" class="flex flex-wrap gap-2">
          <li v-for="school in stats.goldSchools[g.tier]" :key="school" class="rounded-md border border-success-soft-fg/30 bg-success-soft px-2 py-0.5 text-sm text-success-soft-fg">{{ school }}</li>
        </ul>
        <p v-else class="text-sm text-fg-subtle">本届无{{ g.title }}院校获得金牌。</p>
      </SectionCard>
    </div>
  </div>
</template>
