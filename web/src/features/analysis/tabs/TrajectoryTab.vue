<script setup lang="ts">
/**
 * 轨迹分析：五年奖牌轨迹表（只读预生成 trajectories.json）。
 * - 六列表头三态排序（年度列 \＜铁＜铜＜银＜金，并列保持 JSON 顺序）
 * - 每行是真实链接（D5）：首格放 RouterLink 并以 ::after 撑满整行，可 Ctrl/中键新标签打开
 * - 点击时只给被点行设置共享元素名，切到名单页时与其轨迹条形变（§8.2）
 */
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { Trajectories, TrajectoryRow } from '@/domain/types'
import { TIER_TEXT, YEAR_LABELS, tiersToCode, trajectoryRangeText, yearSortMethod } from '@/domain/trajectory'
import SectionCard from '@/shared/components/SectionCard.vue'
import DataTable from '@/shared/components/DataTable.vue'
import type { Column } from '@/shared/components/data-table'
import TierGlyph from '@/features/trajectory/TierGlyph.vue'

const props = defineProps<{ data: Trajectories | null; year: string }>()
const rows = computed(() => props.data?.rows ?? [])
const rangeText = computed(() => trajectoryRangeText(props.data))
const pageYear = computed(() => props.data?.window?.[1] ?? '')
const clicked = ref<string | null>(null)

const columns: Column<TrajectoryRow>[] = [
  ...YEAR_LABELS.map((label, i) => ({
    key: `y${i}`, label, width: 100, align: 'center' as const, sortable: true,
    compare: yearSortMethod(i), value: (r: TrajectoryRow) => TIER_TEXT[r.tiers[i]!],
  })),
  { key: 'count', label: '选手数', width: 100, align: 'center', sortable: true, value: r => r.count },
]
const glyphs = (r: TrajectoryRow) => r.tiers.map(t => TIER_TEXT[t]).join(' ')
</script>

<template>
  <SectionCard v-if="!data">
    <p class="py-8 text-center text-sm text-fg-subtle">轨迹数据暂不可用</p>
  </SectionCard>

  <SectionCard v-else title="五年奖牌轨迹">
    <p class="mb-3 text-xs leading-relaxed text-fg-subtle">
      仅统计 {{ pageYear }} 年获奖（金/银/铜）的选手，以 {{ pageYear }} 年为最后一次获奖，按 学校+姓名 去重共 {{ data.total }} 人；从其在统计范围内首次参赛年起连续 5 个年度取当年最高奖牌，\ 为该年未参赛。统计范围 {{ rangeText }}；表头可点击排序（\＜铁＜铜＜银＜金），点击行可查看该轨迹的全部选手
    </p>
    <DataTable
      :columns="columns"
      :rows="rows"
      :row-key="r => tiersToCode(r.tiers)"
      caption="五年奖牌轨迹"
      :width="600"
      size="lg"
      row-class="relative cursor-pointer"
      data-trajectory-table
    >
      <template #cell-y0="{ row }">
        <RouterLink
          :to="`/${year}/trajectory/${tiersToCode(row.tiers)}`"
          class="row-link after:absolute after:inset-0 after:content-['']"
          :aria-label="`查看轨迹 ${glyphs(row)} 的选手名单`"
          :style="clicked === tiersToCode(row.tiers) ? { viewTransitionName: `traj-${tiersToCode(row.tiers)}`, viewTransitionClass: 'shared' } : undefined"
          @click="clicked = tiersToCode(row.tiers)"
        ><TierGlyph :tier="row.tiers[0]!" /></RouterLink>
      </template>
      <template v-for="i in [1, 2, 3, 4]" :key="i" #[`cell-y${i}`]="{ row }"><TierGlyph :tier="row.tiers[i]!" /></template>
    </DataTable>
  </SectionCard>
</template>

<style scoped>
/* 整行链接的焦点环画在整行上 */
.row-link:focus-visible { outline: none; }
.row-link:focus-visible::after { outline: 2px solid var(--ring); outline-offset: -2px; border-radius: 4px; }
</style>
