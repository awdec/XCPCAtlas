<script setup lang="ts">
/**
 * 全部成绩（B-S1–B-S7）：
 * - 赛区文件按索引顺序逐个加载并显示 x/n 进度（D1：去掉每个文件后的 120ms 等待）
 * - 搜索 300ms 防抖（D4），下拉即时；筛选变化回到第 1 页；每页 20
 * - 整行文字按奖牌着色（B-S6）
 */
import { computed, reactive, ref } from 'vue'
import { useSchoolTags, useSummaryRows } from '@/data/queries'
import { filterSummary, type MedalFilter, type SchoolType } from '@/domain/filters'
import { medalLabel, medalTone } from '@/domain/medal'
import { summaryContestOptions, type SummaryRow } from '@/domain/aggregate'
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
import PlayerLink from '@/entities/player/PlayerLink.vue'
import { medalOptions, oiCountOptions, schoolTypeOptions } from '@/features/ranking/filter-options'

const PAGE_SIZE = 20
const props = defineProps<{ year: string }>()

const rowsQ = useSummaryRows(() => props.year)
const tagsQ = useSchoolTags()
const tags = computed(() => tagsQ.data.value ?? { set985: new Set<string>(), set211: new Set<string>() })
const rows = computed<SummaryRow[]>(() => rowsQ.data.value ?? [])

const search = reactive({ school: '', team: '', member: '' })
const { debounced, pending: searchPending } = useDebouncedRef(computed(() => ({ ...search })), 300)
const contest = ref<string | null>('')
const schoolType = ref<SchoolType | null>('')
const oiCount = ref<number | '' | null>('')
const medal = ref<MedalFilter | null>('')

const contestOptions = computed(() => summaryContestOptions(rows.value).map(n => ({ label: n, value: n })))
const filtered = computed(() => filterSummary(rows.value, {
  ...debounced.value,
  contest: contest.value ?? '',
  schoolType: schoolType.value ?? '',
  oiCount: oiCount.value,
  medal: medal.value ?? '',
}, tags.value))
const { page, total, current } = usePagedList(filtered, PAGE_SIZE, [debounced, contest, schoolType, oiCount, medal])

const columns: Column<SummaryRow>[] = [
  { key: 'contest', label: '比赛名', minWidth: 180, pinned: true, value: r => r.contestName },
  { key: 'rank', label: '排名', width: 80, align: 'center', value: r => r.rank },
  { key: 'school', label: '学校', minWidth: 180, value: r => r.school },
  { key: 'team', label: '队伍名', minWidth: 180, value: r => r.team },
  ...[0, 1, 2].map(i => ({ key: `m${i}`, label: `选手 ${i + 1}`, minWidth: 120, value: (r: SummaryRow) => r.members[i]?.name })),
  { key: 'medal', label: '奖项', width: 100, align: 'center', value: r => medalLabel(r.medal) },
]
const rowKey = (r: SummaryRow, i: number) => `${r.contestName}|${r.rank}|${r.team}|${i}`
const loading = computed(() => rowsQ.isPending.value || tagsQ.isPending.value)
const failed = computed(() => rowsQ.isError.value || tagsQ.isError.value)
</script>

<template>
  <div>
    <h2 class="mb-2 text-2xl font-bold text-fg">{{ year }} 年全部成绩汇总</h2>

    <LoadProgress v-if="loading" :done="rowsQ.progress.value.done" :total="rowsQ.progress.value.total" />
    <ResultState v-else-if="failed" title="加载失败" sub-title="数据加载失败，请稍后重试" />

    <template v-else>
      <FilterBar :count="`共 ${filtered.length} 条记录`">
        <template #search>
          <TextInput v-model="search.school" placeholder="搜索学校" class="sm:w-40" />
          <TextInput v-model="search.team" placeholder="搜索队伍" class="sm:w-40" />
          <TextInput v-model="search.member" placeholder="搜索队员" class="sm:w-40" />
        </template>
        <template #selects>
          <Select v-model="contest" :options="contestOptions" placeholder="比赛" clearable class="col-span-2 sm:w-48" />
          <Select v-model="schoolType" :options="schoolTypeOptions" placeholder="学校类型" clearable class="sm:w-32" />
          <Select v-model="oiCount" :options="oiCountOptions" placeholder="OI 人数" clearable class="sm:w-32" />
          <Select v-model="medal" :options="medalOptions" placeholder="奖项" clearable class="sm:w-28" />
        </template>
      </FilterBar>

      <DataTable
        :columns="columns"
        :rows="current"
        :row-key="rowKey"
        :text-tone="r => medalTone(r.medal)"
        :caption="`${year} 年全部成绩`"
        :pending="searchPending"
      >
        <template #cell-school="{ row }">
          <SchoolLink :year="year" :school="row.school" /><SchoolTierTag :school="row.school" :set985="tags.set985" :set211="tags.set211" />
        </template>
        <template v-for="i in [0, 1, 2]" :key="i" #[`cell-m${i}`]="{ row }">
          <PlayerLink v-if="row.members[i]" :year="year" :member="row.members[i]!" />
        </template>
      </DataTable>

      <Pager v-if="filtered.length" v-model="page" :total="total" :summary="`每页 ${PAGE_SIZE} 条，共 ${filtered.length} 条，${total} 页`" />
    </template>
  </div>
</template>
