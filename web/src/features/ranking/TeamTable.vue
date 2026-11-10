<script setup lang="ts">
/**
 * 队伍榜单表格（Contest B-C5 / School B-SC4 共用）：
 * 首列（排名或比赛名）固定；学校链接+层次标签；队伍名为按钮（打开详情）；选手1–3 为 PlayerLink；
 * 行底色按奖牌（B-C6）。
 */
import { computed } from 'vue'
import type { Member, SchoolTags, TeamRow } from '@/domain/types'
import { medalTone } from '@/domain/medal'
import DataTable from '@/shared/components/DataTable.vue'
import type { Column } from '@/shared/components/data-table'
import SchoolLink from '@/entities/school/SchoolLink.vue'
import SchoolTierTag from '@/entities/school/SchoolTierTag.vue'
import PlayerLink from '@/entities/player/PlayerLink.vue'

type Row = TeamRow & { _contest?: string }

const props = defineProps<{
  rows: Row[]
  year: string
  tags: SchoolTags
  /** contest：队排/校排；school：比赛名/排名 */
  mode: 'contest' | 'school'
  caption: string
  pending?: boolean
}>()
const emit = defineEmits<{ teamClick: [row: Row] }>()

const memberCols = (label: (i: number) => string): Column<Row>[] => [0, 1, 2].map(i => ({
  key: `m${i}`, label: label(i), minWidth: 100, value: (r: Row) => r.members[i]?.name,
}))

const columns = computed<Column<Row>[]>(() => (props.mode === 'contest'
  ? [
      { key: 'rank', label: '队排', width: 70, align: 'center', pinned: true, value: r => r.rank },
      { key: 'org_rank', label: '校排', width: 60, align: 'center', value: r => r.org_rank },
      { key: 'school', label: '学校', minWidth: 160, truncate: true, value: r => r.school },
      { key: 'team', label: '队伍', minWidth: 130, truncate: true, value: r => r.team },
      ...memberCols(i => `选手${i + 1}`),
    ]
  : [
      { key: 'contest', label: '比赛名', minWidth: 180, pinned: true, value: r => r._contest },
      { key: 'rank', label: '排名', width: 70, align: 'center', value: r => r.rank },
      { key: 'school', label: '学校', minWidth: 160, truncate: true, value: r => r.school },
      { key: 'team', label: '队伍', minWidth: 130, truncate: true, value: r => r.team },
      ...memberCols(i => `选手${i + 1}`),
    ]))

const member = (r: Row, i: number): Member | undefined => r.members[i]
const rowKey = (r: Row, i: number) => `${r._contest ?? ''}|${r.rank}|${r.school}|${r.team}|${i}`
</script>

<template>
  <DataTable
    :columns="columns"
    :rows="rows"
    :row-key="rowKey"
    :tone="r => medalTone(r.medal)"
    :caption="caption"
    :pending="pending"
    size="sm"
  >
    <template #cell-school="{ row }">
      <SchoolLink :year="year" :school="row.school" /><SchoolTierTag :school="row.school" :set985="tags.set985" :set211="tags.set211" />
    </template>
    <template #cell-team="{ row }">
      <button
        type="button"
        class="max-w-full truncate rounded text-left text-fg hover:text-primary focus-visible:text-primary"
        :aria-label="`查看队伍详情：${row.team}`"
        @click.stop="emit('teamClick', row)"
      >{{ row.team }}</button>
    </template>
    <template v-for="i in [0, 1, 2]" :key="i" #[`cell-m${i}`]="{ row }">
      <PlayerLink v-if="member(row, i)" :year="year" :member="member(row, i)!" />
    </template>
  </DataTable>
</template>
