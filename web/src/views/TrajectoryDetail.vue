<script setup>
import { computed, ref, watch } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { loadTrajectories } from '../utils/dataLoader'
import { TIER_TEXT, TIER_CLASS, codeToTiers } from '../utils/trajectory'

const props = defineProps({
  year: {
    type: String,
    required: true
  },
  // 轨迹编码，如 "i-b-g-n-n"（见 utils/trajectory.js）
  code: {
    type: String,
    required: true
  }
})

const YEAR_LABELS = ['第一年', '第二年', '第三年', '第四年', '第五年']

const loading = ref(true)
const meta = ref(null)   // { window, years, total }
const row = ref(null)    // { tiers, count, players } 或 null（未找到）

let loadSeq = 0

const load = async (year, code) => {
  const seq = ++loadSeq
  loading.value = true
  meta.value = null
  row.value = null
  try {
    const d = await loadTrajectories(year)
    if (seq !== loadSeq) return
    meta.value = d
    const tiers = codeToTiers(code)
    if (tiers) {
      row.value = d.rows.find(r => r.tiers.join() === tiers.join()) || null
    }
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('加载轨迹数据失败:', e)
    meta.value = null
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

watch(
  [() => props.year, () => props.code],
  ([year, code]) => load(year, code),
  { immediate: true }
)

const tiers = computed(() => codeToTiers(props.code))

// 窗口右端即页面归属年，与轨迹表说明一致
const pageYear = computed(() => meta.value?.window?.[1] ?? props.year)
</script>

<template>
  <div>
    <router-link
      :to="{ name: 'Analysis', params: { year }, query: { tab: 'trajectory' } }"
      class="text-blue-600 hover:underline text-sm"
    >
      ← 返回数据分析
    </router-link>

    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading text-3xl text-blue-500"><Loading /></el-icon>
    </div>

    <div v-else-if="!meta" class="flex justify-center py-20">
      <el-result icon="warning" title="加载失败" sub-title="轨迹数据暂不可用" />
    </div>

    <div v-else-if="!tiers" class="flex justify-center py-20">
      <el-result icon="warning" title="轨迹编码无效" sub-title="URL 中的轨迹格式不正确" />
    </div>

    <div v-else-if="!row" class="flex justify-center py-20">
      <el-result icon="info" title="未找到该轨迹" sub-title="该轨迹人数为 0 或数据已更新" />
    </div>

    <div v-else>
      <h2 class="text-2xl font-bold text-gray-800 mb-2">轨迹选手名单</h2>
      <p class="text-xs text-gray-400 mb-4">
        仅统计 {{ pageYear }} 年获奖（金/银/铜）的选手，以 {{ pageYear }} 年为最后一次获奖；
        从其在统计范围内首次参赛年起连续 5 个年度取当年最高奖牌，\ 为该年未参赛
      </p>

      <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
        <div class="flex items-center justify-center gap-6 mb-1">
          <div v-for="(label, i) in YEAR_LABELS" :key="label" class="text-center">
            <div class="text-xs text-gray-400 mb-1">{{ label }}</div>
            <div class="text-xl" :class="TIER_CLASS[row.tiers[i]]">{{ TIER_TEXT[row.tiers[i]] }}</div>
          </div>
          <div class="text-center">
            <div class="text-xs text-gray-400 mb-1">选手数</div>
            <div class="text-xl font-semibold text-gray-800">{{ row.count }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <el-table
          :data="row.players"
          stripe
          border
          max-height="70vh"
          style="width: 480px; margin-left: auto; margin-right: auto; font-size: 16px"
        >
          <el-table-column label="学校" prop="0" width="240" align="center" show-overflow-tooltip />
          <el-table-column label="姓名" width="240" align="center">
            <template #default="{ row: p }">
              <router-link
                :to="{ name: 'Player', params: { year, name: p[1] }, query: { scope: 'all', school: p[0] } }"
                class="text-blue-600 hover:underline"
              >
                {{ p[1] }}
              </router-link>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>
