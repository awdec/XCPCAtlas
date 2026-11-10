<script setup lang="ts">
/**
 * 学校页（B-SC1–B-SC5）：
 * - 名称取路由参数（D7：只由路由解码一次）
 * - 最佳排名：无有效排名时显示 —（D3）
 * - 未知学校不是 404：显示 0 支队伍与空表
 */
import { computed, ref } from 'vue'
import { useSchoolTags, useSchoolTeams } from '@/data/queries'
import { schoolStats, type SchoolTeamRow } from '@/domain/aggregate'
import type { TeamRow } from '@/domain/types'
import Skeleton from '@/shared/components/Skeleton.vue'
import AsyncState from '@/shared/components/AsyncState.vue'
import TeamTable from '@/features/ranking/TeamTable.vue'
import TeamDetailDialog from '@/features/ranking/TeamDetailDialog.vue'

const props = defineProps<{ year: string; name: string }>()

const teamsQ = useSchoolTeams(() => props.year, () => props.name)
const tagsQ = useSchoolTags()
const tags = computed(() => tagsQ.data.value ?? { set985: new Set<string>(), set211: new Set<string>() })
const teams = computed<SchoolTeamRow[]>(() => teamsQ.data.value ?? [])
const stats = computed(() => schoolStats(teams.value))

const selected = ref<TeamRow | null>(null)
const dialogOpen = ref(false)
const openTeam = (t: TeamRow) => { selected.value = t; dialogOpen.value = true }
</script>

<template>
  <AsyncState :pending="teamsQ.isPending.value || tagsQ.isPending.value" :error="teamsQ.isError.value || tagsQ.isError.value" error-text="学校数据加载失败，请稍后重试">
    <template #skeleton>
      <div class="mb-6 h-8 w-48 skeleton" />
      <Skeleton variant="table" :count="8" />
    </template>
    <div>
      <h2 class="mb-2 text-2xl font-bold text-fg">{{ name }}</h2>
      <div class="mb-6 flex gap-6 text-sm text-fg-subtle">
        <span>参赛队伍: <b class="tabular text-fg">{{ stats.count }}</b></span>
        <span>最佳排名: <b class="tabular text-success-soft-fg">{{ stats.bestRank != null ? '#' + stats.bestRank : '—' }}</b></span>
      </div>

      <TeamTable :rows="teams" :year="year" :tags="tags" mode="school" :caption="`${name} 参赛队伍`" @team-click="openTeam" />
      <TeamDetailDialog v-model:open="dialogOpen" :team="selected" />
    </div>
  </AsyncState>
</template>
