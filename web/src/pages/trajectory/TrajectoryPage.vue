<script setup lang="ts">
/**
 * 轨迹名单页（B-T1–B-T3）。状态顺序：加载中 → 数据失败 → 编码无效 → 未找到 → 内容（均非 404）。
 * 名单超过 200 人时虚拟滚动；姓名链接到 ?scope=all&school= 的历年个人页。
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useTrajectories } from '@/data/queries'
import { YEAR_LABELS, codeToTiers } from '@/domain/trajectory'
import Skeleton from '@/shared/components/Skeleton.vue'
import AsyncState from '@/shared/components/AsyncState.vue'
import ResultState from '@/shared/components/ResultState.vue'
import SectionCard from '@/shared/components/SectionCard.vue'
import DataTable from '@/shared/components/DataTable.vue'
import type { Column } from '@/shared/components/data-table'
import TierGlyph from '@/features/trajectory/TierGlyph.vue'

const props = defineProps<{ year: string; code: string }>()
const q = useTrajectories(() => props.year)
const tiers = computed(() => codeToTiers(props.code))
const row = computed(() => {
  const t = tiers.value
  if (!t || !q.data.value) return null
  return q.data.value.rows.find(r => r.tiers.join() === t.join()) ?? null
})
const pageYear = computed(() => q.data.value?.window?.[1] ?? props.year)

type P = [string, string]
const cols: Column<P>[] = [
  { key: 'school', label: '学校', width: 240, align: 'center', truncate: true, value: p => p[0] },
  { key: 'name', label: '姓名', width: 240, align: 'center', value: p => p[1] },
]
</script>

<template>
  <div>
    <RouterLink :to="{ name: 'Analysis', params: { year }, query: { tab: 'trajectory' } }" class="text-sm text-primary hover:underline underline-offset-2">
      ← 返回数据分析
    </RouterLink>

    <AsyncState :pending="q.isPending.value" :error="q.isError.value" error-text="轨迹数据暂不可用">
      <template #skeleton>
        <Skeleton variant="block" height="6rem" class="mt-6" />
        <Skeleton variant="table" :count="8" class="mt-4" />
      </template>
      <ResultState v-if="!tiers" title="轨迹编码无效" sub-title="URL 中的轨迹格式不正确" />
      <ResultState v-else-if="!row" icon="info" title="未找到该轨迹" sub-title="该轨迹人数为 0 或数据已更新" />
      <div v-else class="mt-2">
        <h2 class="mb-2 text-2xl font-bold text-fg">轨迹选手名单</h2>
        <p class="mb-4 text-xs text-fg-subtle">
          仅统计 {{ pageYear }} 年获奖（金/银/铜）的选手，以 {{ pageYear }} 年为最后一次获奖；
          从其在统计范围内首次参赛年起连续 5 个年度取当年最高奖牌，\ 为该年未参赛
        </p>

        <SectionCard class="mb-4">
          <div class="flex flex-wrap items-center justify-center gap-6" :style="{ viewTransitionName: `traj-${code}`, viewTransitionClass: 'shared' }">
            <div v-for="(label, i) in YEAR_LABELS" :key="label" class="text-center">
              <div class="mb-1 text-xs text-fg-subtle">{{ label }}</div>
              <div class="text-xl"><TierGlyph :tier="row.tiers[i]!" /></div>
            </div>
            <div class="text-center">
              <div class="mb-1 text-xs text-fg-subtle">选手数</div>
              <div class="text-xl font-semibold tabular text-fg">{{ row.count }}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <DataTable :columns="cols" :rows="row.players" :row-key="(p, i) => `${p[0]}|${p[1]}|${i}`" caption="轨迹选手名单" :width="480" size="lg">
            <template #cell-name="{ row: p }">
              <RouterLink
                :to="{ name: 'Player', params: { year, name: p[1] }, query: { scope: 'all', school: p[0] } }"
                class="text-primary hover:underline underline-offset-2"
              >{{ p[1] }}</RouterLink>
            </template>
          </DataTable>
        </SectionCard>
      </div>
    </AsyncState>
  </div>
</template>
