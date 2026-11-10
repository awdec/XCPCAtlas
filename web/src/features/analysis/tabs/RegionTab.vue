<script setup lang="ts">
/** 赛站分析：各赛站获奖人数（选手口径）、跨赛站获奖迁移（赛站下拉 + 热力图 + 明细表） */
import { computed, ref } from 'vue'
import { computeRegionStats, MEDAL_LABELS, MEDAL_ORDER } from '@/domain/analysis'
import type { YearDataset } from '@/domain/types'
import { regionCellText, regionMatrixOption, regionMigrationRows, regionPerSiteOption, type MigrationTableRow } from '../charts/options'
import ChartBox from '../charts/ChartBox.vue'
import SectionCard from '@/shared/components/SectionCard.vue'
import Select from '@/shared/ui/Select.vue'
import DataTable from '@/shared/components/DataTable.vue'
import type { Column } from '@/shared/components/data-table'

const props = defineProps<{ dataset: YearDataset }>()
const stats = computed(() => computeRegionStats(props.dataset))
const perSiteOption = computed(() => regionPerSiteOption(stats.value))

const regionId = ref<string | null>('')
const regionOptions = computed(() => stats.value.perSite.map(r => ({ label: r.name, value: r.regionId })))
const activeRegion = computed(() => (regionId.value ? regionId.value : stats.value.perSite[0]?.regionId))
const activeRegionName = computed(() => stats.value.perSite.find(x => x.regionId === activeRegion.value)?.name ?? '')
const migrationRows = computed(() => regionMigrationRows(stats.value, activeRegion.value))
const matrixOption = computed(() => regionMatrixOption(migrationRows.value))

const cols: Column<MigrationTableRow>[] = [
  { key: 'tier', label: '本站奖牌', width: 110, align: 'center', value: r => r.tier },
  { key: 'total', label: '有其他站记录', width: 140, align: 'center', value: r => r.total },
  ...MEDAL_ORDER.map((t, i) => ({
    key: `c${i}`, label: `其他站最好${MEDAL_LABELS[t]}`, minWidth: 110, align: 'center' as const,
    value: (r: MigrationTableRow) => regionCellText(r.cells[i]!),
  })),
]
</script>

<template>
  <div class="space-y-4">
    <SectionCard title="各赛站获奖人数" reveal>
      <ChartBox :option="perSiteOption" height="420px" label="各赛站获奖人数（堆叠柱状图）" />
    </SectionCard>

    <SectionCard reveal>
      <div class="mb-1">
        <!-- 旧实现：默认选中第一个赛站，不可清空 -->
        <Select v-model="regionId" :options="regionOptions" placeholder="选择赛站" class="w-44" :display="activeRegionName" />
      </div>
      <p class="mb-2 text-xs text-fg-subtle">
        在<b class="text-fg-muted">{{ activeRegionName }}</b>获得某档奖牌的选手，其当年在其他赛站的最好成绩分布；仅统计还参加过其他赛站的选手
      </p>
      <ChartBox v-if="migrationRows.length" :option="matrixOption" height="300px" :label="`${activeRegionName}跨赛站获奖迁移热力图`" />
      <div class="mt-4">
        <DataTable :columns="cols" :rows="migrationRows" :row-key="r => r.tier" caption="跨赛站获奖迁移明细" :width="880" size="lg" max-height="none" />
      </div>
    </SectionCard>
  </div>
</template>
