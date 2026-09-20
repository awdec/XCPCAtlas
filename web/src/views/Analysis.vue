<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { loadContestsIndex, loadContestData, loadSchoolTags } from '../utils/dataLoader'
import { buildYearDataset, computeOverview } from '../utils/analysis'
import OverviewTab from '../components/analysis/OverviewTab.vue'
import RegionTab from '../components/analysis/RegionTab.vue'
import PlayersTab from '../components/analysis/PlayersTab.vue'
import OIerTab from '../components/analysis/OIerTab.vue'
import SchoolTab from '../components/analysis/SchoolTab.vue'

const props = defineProps({
  year: {
    type: String,
    required: true
  }
})

const activeTab = ref('overview')
const loading = ref(true)
const error = ref('')
const loadProgress = ref(0)
const loadTotal = ref(0)

const dataset = ref(null)
const tags = ref({ set985: new Set(), set211: new Set() })
let loadSeq = 0

const overview = computed(() => (dataset.value ? computeOverview(dataset.value) : null))

const loadData = async (year) => {
  const seq = ++loadSeq
  loading.value = true
  error.value = ''
  loadProgress.value = 0
  dataset.value = null

  try {
    tags.value = await loadSchoolTags()
    const index = await loadContestsIndex(year)
    if (seq !== loadSeq) return
    loadTotal.value = index.length
    const allData = []
    for (const c of index) {
      allData.push(await loadContestData(year, c.id))
      if (seq !== loadSeq) return
      loadProgress.value++
      await nextTick()
    }
    if (seq !== loadSeq) return
    dataset.value = buildYearDataset(allData)
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('加载分析数据失败:', e)
    error.value = '数据加载失败，请稍后重试'
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

onMounted(() => loadData(props.year))
watch(() => props.year, (newYear) => {
  if (newYear) loadData(newYear)
})
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-800 mb-2">📈 数据分析</h2>

    <div v-if="loading" class="flex flex-col items-center py-20">
      <el-progress
        :percentage="loadTotal ? Math.round(loadProgress / loadTotal * 100) : 0"
        :stroke-width="10"
        style="width: 360px"
      />
      <p class="text-gray-500 mt-3 text-sm">正在加载比赛数据（{{ loadProgress }} / {{ loadTotal }}）</p>
    </div>

    <div v-else-if="error" class="flex justify-center py-20">
      <el-result icon="warning" title="加载失败" :sub-title="error" />
    </div>

    <el-tabs v-else v-model="activeTab">
      <el-tab-pane label="总览" name="overview">
        <OverviewTab v-if="overview" :overview="overview" />
      </el-tab-pane>

      <el-tab-pane label="赛站分析" name="region">
        <RegionTab v-if="dataset" :dataset="dataset" />
      </el-tab-pane>

      <el-tab-pane label="选手分析" name="players">
        <PlayersTab v-if="dataset" :dataset="dataset" :year="year" />
      </el-tab-pane>

      <el-tab-pane label="OIer 分析" name="oier">
        <OIerTab v-if="dataset" :dataset="dataset" />
      </el-tab-pane>

      <el-tab-pane label="学校分析" name="school">
        <SchoolTab v-if="dataset" :dataset="dataset" :tags="tags" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
