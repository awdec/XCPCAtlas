<script setup lang="ts">
/**
 * 选手成绩（B-P1–B-P5）：学校+姓名聚合（Worker 计算）；搜索 300ms 防抖（D4）；每页 20。
 */
import { computed, reactive, ref } from 'vue'
import { usePlayerBoard, useSchoolTags } from '@/data/queries'
import { filterPlayers, type SchoolType } from '@/domain/filters'
import type { PlayerBoardRow } from '@/domain/aggregate'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { usePagedList } from '@/shared/composables/usePagedList'
import TextInput from '@/shared/ui/TextInput.vue'
import Select from '@/shared/ui/Select.vue'
import FilterBar from '@/shared/components/FilterBar.vue'
import Pager from '@/shared/components/Pager.vue'
import LoadProgress from '@/shared/components/LoadProgress.vue'
import ResultState from '@/shared/components/ResultState.vue'
import DataTable from '@/shared/components/DataTable.vue'
import type { Column } from '@/shared/components/data-table'
import SchoolLink from '@/entities/school/SchoolLink.vue'
import SchoolTierTag from '@/entities/school/SchoolTierTag.vue'
import PlayerNameLink from '@/entities/player/PlayerNameLink.vue'
import { atLeastOptions, oiHasOptions, schoolTypeOptions } from '@/features/ranking/filter-options'

const PAGE_SIZE = 20
const props = defineProps<{ year: string }>()

const boardQ = usePlayerBoard(() => props.year)
const tagsQ = useSchoolTags()
const tags = computed(() => tagsQ.data.value ?? { set985: new Set<string>(), set211: new Set<string>() })
const rows = computed<PlayerBoardRow[]>(() => boardQ.data.value ?? [])

const search = reactive({ school: '', player: '' })
const { debounced, pending: searchPending } = useDebouncedRef(computed(() => ({ ...search })), 300)
const schoolType = ref<SchoolType | null>('')
const gold = ref<number | '' | null>('')
const silver = ref<number | '' | null>('')
const bronze = ref<number | '' | null>('')
const oi = ref<'yes' | 'no' | '' | null>('')

const filtered = computed(() => filterPlayers(rows.value, {
  ...debounced.value,
  schoolType: schoolType.value ?? '',
  gold: gold.value, silver: silver.value, bronze: bronze.value, oi: oi.value,
}, tags.value))
const { page, total, current } = usePagedList(filtered, PAGE_SIZE, [debounced, schoolType, gold, silver, bronze, oi])

const countClass = (n: number, cls: string) => (n > 0 ? `${cls} font-semibold` : 'text-fg-faint')
const columns: Column<PlayerBoardRow>[] = [
  { key: 'school', label: '学校', minWidth: 180, pinned: true, value: r => r.school },
  { key: 'name', label: '选手', minWidth: 140, value: r => r.name },
  { key: 'gold', label: '🥇 金牌', width: 90, align: 'center', value: r => r.gold },
  { key: 'silver', label: '🥈 银牌', width: 90, align: 'center', value: r => r.silver },
  { key: 'bronze', label: '🥉 铜牌', width: 90, align: 'center', value: r => r.bronze },
  { key: 'honorable', label: 'Honorable', width: 100, align: 'center', value: r => r.honorable },
]
const rowKey = (r: PlayerBoardRow) => `${r.school}\0${r.name}`
const loading = computed(() => boardQ.isPending.value || tagsQ.isPending.value)
const failed = computed(() => boardQ.isError.value || tagsQ.isError.value)
</script>

<template>
  <div>
    <h2 class="mb-2 text-2xl font-bold text-fg">{{ year }} 年选手成绩汇总</h2>

    <LoadProgress v-if="loading" :done="boardQ.progress.value.done" :total="boardQ.progress.value.total" />
    <ResultState v-else-if="failed" title="加载失败" sub-title="数据加载失败，请稍后重试" />

    <template v-else>
      <FilterBar :count="`共 ${filtered.length} 位选手`">
        <template #search>
          <TextInput v-model="search.school" placeholder="搜索学校" class="sm:w-40" />
          <TextInput v-model="search.player" placeholder="搜索选手" class="sm:w-40" />
        </template>
        <template #selects>
          <Select v-model="schoolType" :options="schoolTypeOptions" placeholder="学校类型" clearable class="sm:w-32" />
          <Select v-model="gold" :options="atLeastOptions" placeholder="金牌 ≥" clearable class="sm:w-28" />
          <Select v-model="silver" :options="atLeastOptions" placeholder="银牌 ≥" clearable class="sm:w-28" />
          <Select v-model="bronze" :options="atLeastOptions" placeholder="铜牌 ≥" clearable class="sm:w-28" />
          <Select v-model="oi" :options="oiHasOptions" placeholder="OI 奖项" clearable class="sm:w-32" />
        </template>
      </FilterBar>

      <DataTable :columns="columns" :rows="current" :row-key="rowKey" :caption="`${year} 年选手成绩`" size="sm" :pending="searchPending">
        <template #cell-school="{ row }">
          <SchoolLink :year="year" :school="row.school" /><SchoolTierTag :school="row.school" :set985="tags.set985" :set211="tags.set211" />
        </template>
        <template #cell-name="{ row }">
          <PlayerNameLink :year="year" :name="row.name" :oi="row.oi" />
        </template>
        <template #cell-gold="{ row }"><span :class="countClass(row.gold, 'text-medal-gold-text')">{{ row.gold }}</span></template>
        <template #cell-silver="{ row }"><span :class="countClass(row.silver, 'text-medal-silver-text')">{{ row.silver }}</span></template>
        <template #cell-bronze="{ row }"><span :class="countClass(row.bronze, 'text-medal-bronze-text')">{{ row.bronze }}</span></template>
        <template #cell-honorable="{ row }"><span :class="countClass(row.honorable, 'text-medal-hm-text')">{{ row.honorable }}</span></template>
      </DataTable>

      <Pager v-if="filtered.length" v-model="page" :total="total" :summary="`每页 ${PAGE_SIZE} 条，共 ${filtered.length} 条，${total} 页`" />
    </template>
  </div>
</template>
