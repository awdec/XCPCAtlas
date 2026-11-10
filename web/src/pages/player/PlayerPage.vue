<script setup lang="ts">
/**
 * 选手页（B-PL1–B-PL9）：
 * - 名称取路由参数（D7）
 * - 年度页按姓名检索（同名跨校合并）；?scope=all&school= 时检索全部年份并按学校+姓名匹配
 * - OI 记录始终来自页面年份
 * - 切换 ICPC/CCPC 与 OI 奖项两张表
 */
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { usePlayerRecords } from '@/data/queries'
import type { PlayerContestRecord } from '@/domain/aggregate'
import type { OIRecord } from '@/domain/types'
import Skeleton from '@/shared/components/Skeleton.vue'
import AsyncState from '@/shared/components/AsyncState.vue'
import DataTable from '@/shared/components/DataTable.vue'
import type { Column } from '@/shared/components/data-table'
import MedalText from '@/entities/medal/MedalText.vue'
import SegmentedControl from '@/shared/ui/SegmentedControl.vue'

const props = defineProps<{ year: string; name: string }>()
const route = useRoute()
const allYears = computed(() => route.query.scope === 'all')
const school = computed(() => (allYears.value && typeof route.query.school === 'string' ? route.query.school : ''))

const recQ = usePlayerRecords(() => props.year, () => props.name, allYears, school)
const icpc = computed<PlayerContestRecord[]>(() => recQ.data.value?.icpc ?? [])
const oi = computed<OIRecord[]>(() => recQ.data.value?.oi ?? [])
const view = ref<'icpc' | 'oi'>('icpc')
const views = computed(() => [
  { value: 'icpc' as const, label: `ICPC/CCPC (${icpc.value.length})` },
  { value: 'oi' as const, label: `OI 奖项 (${oi.value.length})` },
])

const icpcCols: Column<PlayerContestRecord>[] = [
  { key: 'idx', label: '#', width: 50, align: 'center' },
  { key: 'contest', label: '赛区', minWidth: 160, value: r => r.contest },
  { key: 'school', label: '学校', minWidth: 160, value: r => r.school },
  { key: 'team', label: '队伍', minWidth: 130, value: r => r.team },
  { key: 'rank', label: '排名', width: 70, align: 'center', value: r => r.rank },
  { key: 'solved', label: '解题', width: 65, align: 'center', value: r => r.solved },
  { key: 'penalty', label: '罚时', width: 75, align: 'center', value: r => r.penalty },
  { key: 'medal', label: '奖牌', width: 80, align: 'center' },
]
const oiCols: Column<OIRecord>[] = [
  { key: 'idx', label: '#', width: 50, align: 'center' },
  { key: 'comp', label: '比赛', minWidth: 160, value: r => r['比赛'] },
  { key: 'award', label: '奖项', minWidth: 120, value: r => r['奖项'] },
  { key: 'grade', label: '年级', width: 80, align: 'center', value: r => r['年级'] },
  { key: 'school', label: '学校', minWidth: 200, value: r => r['学校'] },
]
</script>

<template>
  <AsyncState :pending="recQ.isPending.value" :error="recQ.isError.value" error-text="选手数据加载失败，请稍后重试">
    <template #skeleton>
      <div class="mb-4 h-8 w-32 skeleton" />
      <div class="mb-4 h-9 w-64 skeleton" />
      <Skeleton variant="table" :count="5" />
    </template>
    <div>
      <h2 class="mb-4 text-2xl font-bold text-fg">{{ name }}</h2>
      <p v-if="allYears" class="mb-4 text-sm text-fg-subtle">
        <span v-if="school">{{ school }} · </span>历年 ICPC/CCPC 获奖记录
      </p>

      <SegmentedControl v-model="view" :options="views" label="记录类型" class="mb-4" />

      <DataTable v-if="view === 'icpc'" :columns="icpcCols" :rows="icpc" :row-key="(r, i) => `${r.year}|${r.contestId}|${r.team}|${i}`" caption="ICPC/CCPC 记录" size="sm" max-height="none">
        <template #cell-idx="{ index }">{{ index + 1 }}</template>
        <template #cell-contest="{ row }">
          <RouterLink :to="`/${row.year}/contest/${row.contestId}`" class="text-primary hover:underline underline-offset-2">
            <span v-if="allYears">{{ row.year }} 年 </span>{{ row.contest }}
          </RouterLink>
        </template>
        <template #cell-school="{ row }">
          <RouterLink :to="`/${row.year}/school/${encodeURIComponent(row.school)}`" class="text-primary hover:underline underline-offset-2">{{ row.school }}</RouterLink>
        </template>
        <template #cell-medal="{ row }"><MedalText :medal="row.medal" /></template>
      </DataTable>

      <DataTable v-else :columns="oiCols" :rows="oi" :row-key="(r, i) => `${r['比赛']}|${r['奖项']}|${i}`" caption="OI 奖项记录" size="sm" max-height="none">
        <template #cell-idx="{ index }">{{ index + 1 }}</template>
      </DataTable>
    </div>
  </AsyncState>
</template>
