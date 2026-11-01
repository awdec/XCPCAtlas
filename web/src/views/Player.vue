<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { loadAllContests, loadOIRecords, loadYears } from '../utils/dataLoader'
import { MEDAL_LABELS, MEDAL_COLORS, medalTier } from '../utils/analysis'

const props = defineProps({
  year: {
    type: String,
    required: true
  }
})

const route = useRoute()
const medalTextColors = { ...MEDAL_COLORS, iron: '#6b7280' }

const playerName = computed(() => decodeURIComponent(route.params.name))
const allYears = computed(() => route.query.scope === 'all')
const playerSchool = computed(() => allYears.value && typeof route.query.school === 'string' ? route.query.school : '')
const activeView = ref('icpc')
const icpcRecords = ref([])
const oiRecords = ref([])
const loading = ref(true)
const error = ref('')
let loadRequestId = 0

const loadData = async (year, name, includeAllYears, school) => {
  const requestId = ++loadRequestId
  loading.value = true
  error.value = ''
  try {
    const years = includeAllYears ? (await loadYears()).map(y => y.year) : [year]
    const [contestYears, oi] = await Promise.all([
      Promise.all(years.map(async recordYear => ({
        year: recordYear,
        contests: await loadAllContests(recordYear),
      }))),
      loadOIRecords(year),
    ])
    if (requestId !== loadRequestId) return

    // ICPC/CCPC 记录
    const results = []
    for (const { year: recordYear, contests } of contestYears) {
      for (const c of contests) {
        const teams = c.sheets['正式队伍'] || []
        for (const t of teams) {
          if (school && t.school !== school) continue
          if (!t.members.some(m => m.name === name)) continue
          results.push({
            year: recordYear,
            contest: c.name,
            contestId: c.id,
            school: t.school,
            team: t.team,
            rank: t.rank,
            solved: t.solved,
            penalty: t.penalty,
            medal: t.medal,
          })
        }
      }
    }
    icpcRecords.value = results.sort((a, b) => a.year - b.year || (a.rank || 999) - (b.rank || 999))

    // OI 记录（轨迹入口匹配完整 name@school，普通入口只匹配姓名；按比赛+奖项去重）
    const seen = new Set()
    const oiResults = []
    Object.entries(oi).forEach(([key, records]) => {
      if (key.split('@')[0] !== name) return
      if (school && key !== `${name}@${school}`) return
      records.forEach(r => {
        const dedupKey = `${r['比赛']}|${r['奖项']}`
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey)
          oiResults.push(r)
        }
      })
    })
    oiRecords.value = oiResults
  } catch (e) {
    if (requestId !== loadRequestId) return
    console.error('加载选手数据失败:', e)
    icpcRecords.value = []
    oiRecords.value = []
    error.value = '选手数据加载失败，请稍后重试'
  } finally {
    if (requestId === loadRequestId) loading.value = false
  }
}

watch(
  [() => props.year, playerName, allYears, playerSchool],
  ([year, name, includeAllYears, school]) => {
    if (year && name) loadData(year, name, includeAllYears, school)
  },
  { immediate: true }
)
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading text-3xl text-blue-500"><Loading /></el-icon>
    </div>

    <div v-else-if="error" class="flex justify-center py-20">
      <el-result icon="warning" title="加载失败" :sub-title="error" />
    </div>

    <div v-else>
      <h2 class="text-2xl font-bold text-gray-800 mb-4">{{ playerName }}</h2>
      <p v-if="allYears" class="text-sm text-gray-500 mb-4">
        <span v-if="playerSchool">{{ playerSchool }} · </span>历年 ICPC/CCPC 获奖记录
      </p>

      <el-radio-group v-model="activeView" size="default" class="mb-4">
        <el-radio-button value="icpc">ICPC/CCPC ({{ icpcRecords.length }})</el-radio-button>
        <el-radio-button value="oi">OI 奖项 ({{ oiRecords.length }})</el-radio-button>
      </el-radio-group>

      <!-- ICPC/CCPC 记录 -->
      <el-table v-if="activeView === 'icpc'" :data="icpcRecords" stripe border size="small">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column label="赛区" min-width="160">
          <template #default="{ row }">
            <router-link :to="`/${row.year}/contest/${row.contestId}`" class="text-blue-600 hover:underline">
              <span v-if="allYears">{{ row.year }} 年 </span>
              {{ row.contest }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column label="学校" min-width="160">
          <template #default="{ row }">
            <router-link :to="`/${row.year}/school/${encodeURIComponent(row.school)}`" class="text-blue-600 hover:underline">
              {{ row.school }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column prop="team" label="队伍" min-width="130" />
        <el-table-column prop="rank" label="排名" width="70" align="center" />
        <el-table-column prop="solved" label="解题" width="65" align="center" />
        <el-table-column prop="penalty" label="罚时" width="75" align="center" />
        <el-table-column label="奖牌" width="80" align="center">
          <template #default="{ row }">
            <span :style="{ color: medalTextColors[medalTier(row.medal)] }" class="font-bold">
              {{ MEDAL_LABELS[medalTier(row.medal)] }}
            </span>
          </template>
        </el-table-column>
      </el-table>

      <!-- OI 奖项记录 -->
      <el-table v-if="activeView === 'oi'" :data="oiRecords" stripe border size="small">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="比赛" label="比赛" min-width="160" />
        <el-table-column prop="奖项" label="奖项" min-width="120" />
        <el-table-column prop="年级" label="年级" width="80" align="center" />
        <el-table-column prop="学校" label="学校" min-width="200" />
      </el-table>
    </div>
  </div>
</template>
