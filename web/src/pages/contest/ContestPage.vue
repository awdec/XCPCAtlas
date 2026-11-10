<script setup lang="ts">
/**
 * 赛区榜单（B-C1–B-C8，B-N2）。
 * - 未知赛区 id（以 contests.json 为准，不依赖 HTTP 状态）→「赛区不存在」（D2）
 * - 搜索 300ms 防抖；任一筛选变化或赛区切换回到第 1 页；每页 100（大榜单分页渲染，AGENTS.md）
 */
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useContest, useContestsIndex, useSchoolTags } from '@/data/queries'
import { filterTeams, type SchoolType } from '@/domain/filters'
import type { TeamRow } from '@/domain/types'
import { useDebouncedRef } from '@/shared/composables/useDebouncedRef'
import { usePagedList } from '@/shared/composables/usePagedList'
import TextInput from '@/shared/ui/TextInput.vue'
import Select from '@/shared/ui/Select.vue'
import Button from '@/shared/ui/Button.vue'
import FilterBar from '@/shared/components/FilterBar.vue'
import Pager from '@/shared/components/Pager.vue'
import Skeleton from '@/shared/components/Skeleton.vue'
import AsyncState from '@/shared/components/AsyncState.vue'
import ResultState from '@/shared/components/ResultState.vue'
import OrgTag from '@/entities/contest/OrgTag.vue'
import TeamTable from '@/features/ranking/TeamTable.vue'
import TeamDetailDialog from '@/features/ranking/TeamDetailDialog.vue'
import { oiCountOptions, schoolTypeOptions } from '@/features/ranking/filter-options'

const PAGE_SIZE = 100
const props = defineProps<{ year: string; id: string }>()

const index = useContestsIndex(() => props.year)
const exists = computed(() => (index.data.value ? index.data.value.some(c => c.id === props.id) : null))
const contestQ = useContest(() => props.year, () => props.id, () => exists.value === true)
const tagsQ = useSchoolTags()
const tags = computed(() => tagsQ.data.value ?? { set985: new Set<string>(), set211: new Set<string>() })

const search = reactive({ school: '', team: '', member: '' })
const { debounced, pending: searchPending } = useDebouncedRef(computed(() => ({ ...search })), 300)
const schoolType = ref<SchoolType | null>('')
const oiCount = ref<number | '' | null>('')

const teams = computed<TeamRow[]>(() => contestQ.data.value?.sheets['正式队伍'] || [])
const filtered = computed(() => filterTeams(teams.value, {
  ...debounced.value,
  schoolType: schoolType.value ?? '',
  oiCount: oiCount.value,
}, tags.value))
const { page, total, current } = usePagedList(filtered, PAGE_SIZE, [debounced, schoolType, oiCount])
watch(() => contestQ.data.value, () => { page.value = 1 })

const pending = computed(() => index.isPending.value || (exists.value === true && (contestQ.isPending.value || tagsQ.isPending.value)))
const failed = computed(() => index.isError.value || contestQ.isError.value || tagsQ.isError.value)

const selected = ref<TeamRow | null>(null)
const dialogOpen = ref(false)
const openTeam = (t: TeamRow) => { selected.value = t; dialogOpen.value = true }
</script>

<template>
  <ResultState v-if="exists === false" icon="notfound" title="赛区不存在" :sub-title="`${year} 赛季没有该赛区`">
    <Button as-child variant="primary"><RouterLink :to="`/${year}/`">返回赛区列表</RouterLink></Button>
  </ResultState>

  <AsyncState v-else :pending="pending" :error="failed" error-text="赛区数据加载失败，请稍后重试">
    <template #skeleton>
      <div class="mb-6 h-8 w-56 skeleton" />
      <Skeleton variant="table" :count="10" />
    </template>
    <div v-if="contestQ.data.value">
      <div class="mb-6 flex items-center gap-3" :style="{ viewTransitionName: `contest-${id}`, viewTransitionClass: 'shared' }">
        <h2 class="text-2xl font-bold text-fg">{{ contestQ.data.value.name }}</h2>
        <OrgTag :org="contestQ.data.value.org" />
      </div>

      <FilterBar :count="`共 ${filtered.length} 支队伍`">
        <template #search>
          <TextInput v-model="search.school" placeholder="搜索学校" class="sm:w-40" />
          <TextInput v-model="search.team" placeholder="搜索队伍" class="sm:w-40" />
          <TextInput v-model="search.member" placeholder="搜索队员" class="sm:w-40" />
        </template>
        <template #selects>
          <Select v-model="schoolType" :options="schoolTypeOptions" placeholder="学校类型" clearable class="sm:w-32" />
          <Select v-model="oiCount" :options="oiCountOptions" placeholder="OI 人数" clearable class="sm:w-32" />
        </template>
      </FilterBar>

      <TeamTable :rows="current" :year="year" :tags="tags" mode="contest" :caption="`${contestQ.data.value.name} 排名`" :pending="searchPending" @team-click="openTeam" />

      <Pager v-if="filtered.length" v-model="page" :total="total" :summary="`每页 ${PAGE_SIZE} 条，共 ${total} 页`" />

      <TeamDetailDialog v-model:open="dialogOpen" :team="selected" />
    </div>
  </AsyncState>
</template>
