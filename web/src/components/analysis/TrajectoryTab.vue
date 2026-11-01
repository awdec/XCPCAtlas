<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { TIER_TEXT, TIER_CLASS, tiersToCode } from '../../utils/trajectory'

const props = defineProps({
  // gen_trajectories.py 预生成的 { window, years, total, rows }；null = 加载失败
  data: { type: Object, default: null },
  year: { type: String, required: true },
})

const router = useRouter()

const YEAR_LABELS = ['第一年', '第二年', '第三年', '第四年', '第五年']

// 列排序优先级（小→大）：\ < 铁 < 铜 < 银 < 金（'none' 即未参赛）
const TIER_SORT_ORDER = { none: 0, iron: 1, bronze: 2, silver: 3, gold: 4 }
const yearSortMethod = (i) => (a, b) =>
  (TIER_SORT_ORDER[a.tiers[i]] ?? -1) - (TIER_SORT_ORDER[b.tiers[i]] ?? -1)

const rows = computed(() => props.data?.rows || [])

// 窗口 [Y-4, Y] 与实际有数据的年份可能不一致（如 2022 页窗口从 2018 起但数据从 2020 起）
const rangeText = computed(() => {
  if (!props.data) return ''
  const { window: w, years } = props.data
  return years[0] === w[0] && years[years.length - 1] === w[1]
    ? `${w[0]}–${w[1]}`
    : `${w[0]}–${w[1]}（实际数据 ${years[0]}–${years[years.length - 1]}）`
})

// 页面归属年 = 窗口右端
const pageYear = computed(() => props.data?.window?.[1] ?? '')

// 行点击 → 该轨迹的选手名单页
const onRowClick = (row) => {
  router.push(`/${props.year}/trajectory/${tiersToCode(row.tiers)}`)
}
</script>

<template>
  <div>
    <div v-if="!data" class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <p class="text-sm text-gray-500 py-8 text-center">轨迹数据暂不可用</p>
    </div>

    <div v-else class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <h3 class="text-base font-semibold text-gray-800 mb-1">五年奖牌轨迹</h3>
      <p class="text-xs text-gray-400 mb-3">
        仅统计 {{ pageYear }} 年获奖（金/银/铜）的选手，以 {{ pageYear }} 年为最后一次获奖，按 学校+姓名 去重共 {{ data.total }} 人；从其在统计范围内首次参赛年起连续 5 个年度取当年最高奖牌，\ 为该年未参赛。统计范围 {{ rangeText }}；表头可点击排序（\＜铁＜铜＜银＜金），点击行可查看该轨迹的全部选手
      </p>
      <el-table
        :data="rows"
        stripe
        border
        max-height="70vh"
        row-class-name="cursor-pointer"
        style="width: 600px; margin-left: auto; margin-right: auto; font-size: 16px"
        @row-click="onRowClick"
      >
        <el-table-column
          v-for="(label, i) in YEAR_LABELS"
          :key="label"
          :label="label"
          width="100"
          align="center"
          sortable
          :sort-method="yearSortMethod(i)"
        >
          <template #default="{ row }">
            <span :class="TIER_CLASS[row.tiers[i]]">{{ TIER_TEXT[row.tiers[i]] }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="选手数" width="100" align="center" sortable />
      </el-table>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-table__body tr) {
  cursor: pointer;
}
</style>
